'use client';

import { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import GlitchCard from './GlitchCard';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

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

  // Create contract calls for each glitch's vote count
  const contracts = glitches.map((glitch) => ({
    address: GLITCH_REGISTRY_ADDRESS,
    abi: glitchRegistryABI,
    functionName: 'getVoteCount',
    args: [BigInt(glitch.onchain_glitch_id)],
  }));

  const { data: voteCounts, isLoading } = useReadContracts({
    contracts: GLITCH_REGISTRY_ADDRESS ? contracts : [],
  });

  useEffect(() => {
    if (voteCounts && voteCounts.length > 0) {
      const glitchesWithVotes = glitches.map((glitch, index) => {
        const result = voteCounts[index];
        const voteCount = result?.status === 'success' ? Number(result.result) : 0;
        return { ...glitch, voteCount };
      });

      // Sort by vote count descending
      const sorted = glitchesWithVotes
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 3); // Top 3

      setSortedGlitches(sorted);
    }
  }, [voteCounts, glitches]);

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
            <span className="popular-section__rank">#{index + 1}</span>
            <GlitchCard glitch={glitch} compact />
            <span className="popular-section__votes">▲ {glitch.voteCount}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
