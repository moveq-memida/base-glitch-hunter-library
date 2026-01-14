'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { useSearchParams } from 'next/navigation';
import GlitchCard from './GlitchCard';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

const defaultRpcUrl = base.rpcUrls.default.http[0];
const rpcUrl = (() => {
  const candidate = process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim();
  if (!candidate) return defaultRpcUrl;
  const lower = candidate.toLowerCase();
  if (lower.includes('alchemy.com') || lower.includes('alchemyapi.io')) {
    return defaultRpcUrl;
  }
  return candidate;
})();
const publicClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

interface Glitch {
  id: number;
  title: string;
  game_name: string;
  platform: string;
  tags: string;
  video_url: string | null;
  onchain_glitch_id: number;
  stamp_tx_hash?: string | null;
}

interface PopularGlitchesProps {
  glitches: Glitch[];
}

export default function PopularGlitches({ glitches }: PopularGlitchesProps) {
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const fallbackLang = envLang === 'en' || envLang === 'ja' ? envLang : '';
  const lang = (langParam === 'en' || langParam === 'ja' ? langParam : fallbackLang) || 'ja';
  const isEnglish = lang === 'en';
  const [sortedGlitches, setSortedGlitches] = useState<(Glitch & { voteCount: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const labels = isEnglish
    ? {
        title: 'Popular glitches',
        loading: 'Loading popular glitches',
        votes: 'votes',
        error: 'Failed to load popular glitches.',
        retry: 'Retry',
      }
    : {
        title: '人気のバグ',
        loading: '人気のバグを読み込み中',
        votes: '票',
        error: '人気ランキングの取得に失敗しました。',
        retry: '再読み込み',
      };

  useEffect(() => {
    async function fetchVoteCounts() {
      const registryAddress = GLITCH_REGISTRY_ADDRESS;
      if (!registryAddress || glitches.length === 0) {
        setIsLoading(false);
        setHasError(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        const contracts = glitches.map((glitch) => ({
          address: registryAddress,
          abi: glitchRegistryABI,
          functionName: 'getVoteCount' as const,
          args: [BigInt(glitch.onchain_glitch_id)] as const,
        }));

        const chunkSize = 60;
        const results: bigint[] = [];

        for (let i = 0; i < contracts.length; i += chunkSize) {
          const chunk = contracts.slice(i, i + chunkSize);
          const chunkResults = await publicClient.multicall({
            contracts: chunk,
            allowFailure: true,
          });
          for (const entry of chunkResults) {
            if (entry.status === 'success') {
              results.push(entry.result as bigint);
            } else {
              results.push(BigInt(0));
            }
          }
        }

        const glitchesWithVotes = glitches.map((glitch, index) => ({
          ...glitch,
          voteCount: Number(results[index] ?? BigInt(0)),
        }));

        const sorted = glitchesWithVotes
          .sort((a, b) => b.voteCount - a.voteCount || b.id - a.id)
          .slice(0, 3);

        setSortedGlitches(sorted);
      } catch (error) {
        console.error('Error fetching vote counts:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVoteCounts();
  }, [glitches, retryKey]);

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  if (!GLITCH_REGISTRY_ADDRESS || glitches.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="popular-section">
        <h3 className="popular-section__title">{labels.title}</h3>
        <div className="popular-section__list popular-section__list--skeleton" aria-label={labels.loading}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="popular-section__item">
              <div className="skeleton skeleton-line skeleton-line--short" />
              <div className="skeleton-card">
                <div className="skeleton skeleton-thumb" />
                <div className="skeleton-body">
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--short" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="popular-section">
        <h3 className="popular-section__title">{labels.title}</h3>
        <div className="empty-state">
          <p className="empty-state__copy">{labels.error}</p>
          <div className="empty-state__actions">
            <button type="button" className="button-secondary" onClick={handleRetry}>
              {labels.retry}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (sortedGlitches.length === 0) {
    return null;
  }

  return (
    <section className="popular-section">
      <h3 className="popular-section__title">{labels.title}</h3>
      <div className="popular-section__list">
        {sortedGlitches.map((glitch, index) => (
          <div key={glitch.id} className="popular-section__item">
            <div className="popular-section__item-header">
              <span className="popular-section__rank">#{index + 1}</span>
            </div>
            <GlitchCard glitch={glitch} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
