'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

interface Glitch {
  id: string | number;
  title: string;
  game_name: string;
  platform: string;
  video_url: string | null;
  description: string;
  tags: string;
  author_address: string;
  onchain_glitch_id: number;
}

function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;

  // Already an embed URL
  if (url.includes('youtube.com/embed/')) {
    return url;
  }

  // Extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  // Not a YouTube URL, return as-is (for other video services)
  return url;
}

interface GlitchDetailClientProps {
  glitch: Glitch | null;
}

export default function GlitchDetailClient({ glitch }: GlitchDetailClientProps) {
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();

  // Read vote count from contract
  const { data: voteCount, refetch: refetchVoteCount } = useReadContract({
    address: GLITCH_REGISTRY_ADDRESS,
    abi: glitchRegistryABI,
    functionName: 'getVoteCount',
    args: glitch ? [BigInt(glitch.onchain_glitch_id)] : undefined,
    query: {
      enabled: !!glitch && !!GLITCH_REGISTRY_ADDRESS,
    },
  });

  // Check if user has voted
  const { data: hasVoted } = useReadContract({
    address: GLITCH_REGISTRY_ADDRESS,
    abi: glitchRegistryABI,
    functionName: 'hasUserVoted',
    args: glitch && address ? [BigInt(glitch.onchain_glitch_id), address] : undefined,
    query: {
      enabled: !!glitch && !!address && !!GLITCH_REGISTRY_ADDRESS,
    },
  });

  const handleUpvote = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError('Please connect your wallet to upvote');
      return;
    }

    if (!glitch) {
      setError('Glitch not found');
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError('Contract address not configured');
      return;
    }

    if (hasVoted) {
      setError('You have already voted for this glitch');
      return;
    }

    try {
      writeContract({
        address: GLITCH_REGISTRY_ADDRESS,
        abi: glitchRegistryABI,
        functionName: 'upvote',
        args: [BigInt(glitch.onchain_glitch_id)],
      });
    } catch (error) {
      console.error('Upvote error:', error);
      setError('Failed to upvote. Please try again.');
    }
  };

  // Wait for transaction and refetch vote count
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  React.useEffect(() => {
    if (isConfirmed) {
      refetchVoteCount();
    }
  }, [isConfirmed, refetchVoteCount]);

  if (!glitch) {
    return (
      <div className="page">
        <Header />
        <main className="page-main">
          <p>Glitch not found</p>
          <Link href="/" className="page-back-link">
            Back to list
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const tags = glitch.tags ? glitch.tags.split(',').map((tag) => tag.trim()) : [];

  return (
    <div className="page">
      <Header />
      <main className="page-main">
        <Link href="/" className="page-back-link">
          Back to list
        </Link>

        <h1 className="glitch-detail__title">{glitch.title}</h1>

        <div className="glitch-meta">
          <span>Game: {glitch.game_name}</span>
          <span>Platform: {glitch.platform}</span>
          <span>Hunter: {glitch.author_address}</span>
        </div>

        <section className="glitch-content">
          <div className="glitch-video">
            <div className="glitch-video__frame">
              {glitch.video_url ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={getYouTubeEmbedUrl(glitch.video_url) || ''}
                  title={glitch.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <span>No Video</span>
              )}
            </div>
          </div>

          <div className="glitch-info">
            <div className="glitch-desc">
              <p>{glitch.description}</p>
            </div>

            {tags.length > 0 && (
              <div className="glitch-card__tags" style={{ marginBottom: 0 }}>
                {tags.map((tag, index) => (
                  <span key={index} className="tag-badge">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {error && (
              <p style={{ color: 'var(--c-danger)', marginBottom: '1rem' }}>{error}</p>
            )}

            <section className="glitch-vote">
              <span className="glitch-vote__count">
                {voteCount != null ? voteCount.toString() : '0'}
              </span>
              <button
                type="button"
                className="glitch-vote__button"
                onClick={handleUpvote}
                disabled={isPending || isConfirming || !!hasVoted || !isConnected}
              >
                {isPending || isConfirming
                  ? 'Voting...'
                  : hasVoted
                  ? '✓ Voted'
                  : '▲ Upvote'}
              </button>
            </section>
            {!isConnected && (
              <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>
                Connect your wallet to upvote
              </p>
            )}
          </div>
        </section>

        <section className="glitch-related">
          <h3 className="glitch-related__title">Related Glitches</h3>
          <div className="glitch-list">
            {/* TODO: Fetch related glitches */}
            <p style={{ color: 'var(--c-text-muted)' }}>No related glitches yet.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
