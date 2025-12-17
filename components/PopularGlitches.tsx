'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import GlitchCard from './GlitchCard';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
const publicClient = createPublicClient({
  chain: base,
  transport: rpcUrl ? http(rpcUrl) : http(),
});

interface Glitch {
  id: number;
  title: string;
  game_name: string;
  platform: string;
  tags: string;
  video_url: string | null;
  onchain_glitch_id: number;
}

interface PopularGlitchesProps {
  glitches: Glitch[];
}

export default function PopularGlitches({ glitches }: PopularGlitchesProps) {
  const [sortedGlitches, setSortedGlitches] = useState<(Glitch & { voteCount: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVoteCounts() {
      const registryAddress = GLITCH_REGISTRY_ADDRESS;
      if (!registryAddress || glitches.length === 0) {
        setIsLoading(false);
        return;
      }

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
          .sort((a, b) => b.voteCount - a.voteCount)
          .slice(0, 3);

        setSortedGlitches(sorted);
      } catch (error) {
        console.error('Error fetching vote counts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVoteCounts();
  }, [glitches]);

  if (!GLITCH_REGISTRY_ADDRESS || glitches.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="popular-section">
        <h3 className="popular-section__title">人気のバグ</h3>
        <div className="loading-inline" style={{ minHeight: '4rem' }} aria-label="人気のバグを読み込み中">
          <span className="loading-spinner" aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (sortedGlitches.length === 0 || sortedGlitches.every(g => g.voteCount === 0)) {
    return null;
  }

  return (
    <section className="popular-section">
      <h3 className="popular-section__title">人気のバグ</h3>
      <div className="popular-section__list">
        {sortedGlitches.map((glitch, index) => (
          <div key={glitch.id} className="popular-section__item">
            <div className="popular-section__item-header">
              <span className="popular-section__rank">#{index + 1}</span>
              <span className="popular-section__votes">▲ {glitch.voteCount} 票</span>
            </div>
            <GlitchCard glitch={glitch} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
