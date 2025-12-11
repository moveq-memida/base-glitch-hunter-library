'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import GlitchCard from './GlitchCard';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
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
      if (!GLITCH_REGISTRY_ADDRESS || glitches.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const voteCountPromises = glitches.map((glitch) =>
          publicClient.readContract({
            address: GLITCH_REGISTRY_ADDRESS!,
            abi: glitchRegistryABI,
            functionName: 'getVoteCount',
            args: [BigInt(glitch.onchain_glitch_id)],
          } as const).catch(() => BigInt(0))
        );

        const voteCounts = await Promise.all(voteCountPromises);

        const glitchesWithVotes = glitches.map((glitch, index) => ({
          ...glitch,
          voteCount: Number(voteCounts[index]),
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
        <h3 className="popular-section__title">Popular Glitches</h3>
        <p style={{ color: 'var(--c-text-muted)' }}>Loading...</p>
      </section>
    );
  }

  if (sortedGlitches.length === 0 || sortedGlitches.every(g => g.voteCount === 0)) {
    return null;
  }

  return (
    <section className="popular-section">
      <h3 className="popular-section__title">Popular Glitches</h3>
      <div className="popular-section__list">
        {sortedGlitches.map((glitch, index) => (
          <div key={glitch.id} className="popular-section__item">
            <div className="popular-section__item-header">
              <span className="popular-section__rank">#{index + 1}</span>
              <span className="popular-section__votes">▲ {glitch.voteCount}</span>
            </div>
            <GlitchCard glitch={glitch} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
