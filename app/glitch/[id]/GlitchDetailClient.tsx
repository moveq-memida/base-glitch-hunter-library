'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
  usePublicClient,
} from 'wagmi';
import { base } from 'wagmi/chains';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import CelebrationBurst from '@/components/CelebrationBurst';
import DiscoveryBadge from '@/components/DiscoveryBadge';
import {
  glitchRegistryABI,
  GLITCH_REGISTRY_ADDRESS,
  glitchStampABI,
  GLITCH_STAMP_ADDRESS,
} from '@/lib/contracts';

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
  stamp_hash?: string | null;
  stamp_tx_hash?: string | null;
  stamped_at?: string | Date | null;
  created_at?: string | Date;
  speedrun_category?: string | null;
  estimated_time_save?: string | null;
  difficulty?: number | null;
  game_version?: string | null;
}

interface RelatedGlitch {
  id: number;
  title: string;
  game_name: string;
  platform: string;
  tags: string;
  video_url: string | null;
}

interface GlitchDetailClientProps {
  glitch: Glitch | null;
  relatedGlitches?: RelatedGlitch[];
  prevGlitchId?: number | null;
  nextGlitchId?: number | null;
}

function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;

  if (url.includes('youtube.com/embed/')) {
    return url;
  }

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

  return url;
}

export default function GlitchDetailClient({
  glitch,
  relatedGlitches = [],
  prevGlitchId = null,
  nextGlitchId = null,
}: GlitchDetailClientProps) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [stampTxHash, setStampTxHash] = useState<string | null>(glitch?.stamp_tx_hash || null);
  const [voteToastTxHash, setVoteToastTxHash] = useState<`0x${string}` | null>(null);
  const [stampToastTxHash, setStampToastTxHash] = useState<`0x${string}` | null>(null);
  const [celebrate, setCelebrate] = useState<null | 'vote' | 'stamp'>(null);
  const [displayVoteCount, setDisplayVoteCount] = useState<number | null>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setStampTxHash(glitch?.stamp_tx_hash || null);
  }, [glitch?.stamp_tx_hash, glitch?.id]);

  useEffect(() => {
    setVideoError(false);
  }, [glitch?.video_url]);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const targetChainId = base.id;
  const publicClient = usePublicClient({ chainId: targetChainId });
  const basescanBaseUrl = 'https://basescan.org';
  const targetChainLabel = 'Base mainnet';
  const currentChainLabel =
    chainId === base.id
      ? 'Base mainnet'
      : chainId === 1
      ? 'Ethereum mainnet'
      : `chainId ${chainId}`;

  const {
    writeContract: writeUpvote,
    data: upvoteWriteTxHash,
    isPending: isUpvotePending,
    error: upvoteWriteError,
    reset: resetUpvoteWrite,
  } = useWriteContract();
  const {
    writeContract: writeStamp,
    data: stampWriteTxHash,
    isPending: isStampPending,
    error: stampWriteError,
    reset: resetStampWrite,
  } = useWriteContract();

  const { data: voteCount, refetch: refetchVoteCount } = useReadContract({
    address: GLITCH_REGISTRY_ADDRESS,
    abi: glitchRegistryABI,
    functionName: 'getVoteCount',
    args: glitch ? [BigInt(glitch.onchain_glitch_id)] : undefined,
    query: {
      enabled: !!glitch && !!GLITCH_REGISTRY_ADDRESS,
    },
  });

  const { data: hasVoted, refetch: refetchHasVoted } = useReadContract({
    address: GLITCH_REGISTRY_ADDRESS,
    abi: glitchRegistryABI,
    functionName: 'hasUserVoted',
    args: glitch && address ? [BigInt(glitch.onchain_glitch_id), address] : undefined,
    query: {
      enabled: !!glitch && !!address && !!GLITCH_REGISTRY_ADDRESS,
    },
  });

  useEffect(() => {
    if (voteCount != null) {
      setDisplayVoteCount(Number(voteCount));
    }
  }, [voteCount]);

  useEffect(() => {
    if (!upvoteWriteTxHash) return;
    setDisplayVoteCount((prev) => (prev == null ? prev : prev + 1));
  }, [upvoteWriteTxHash]);

  const handleUpvote = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError('Connect your wallet to vote.');
      return;
    }

    if (!glitch) {
      setError('Glitch not found.');
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError('Contract address is missing.');
      return;
    }

    if (hasVoted) {
      setError('You already voted for this post.');
      return;
    }

    if (chainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
      } catch (switchError) {
        console.error('Network switch error:', switchError);
        setError(`Please switch your wallet to ${targetChainLabel}.`);
        return;
      }
    }

    try {
      const { data: latestHasVoted } = await refetchHasVoted();
      if (latestHasVoted) {
        setError('You already voted for this post.');
        return;
      }

      if (publicClient) {
        const { request } = await publicClient.simulateContract({
          address: GLITCH_REGISTRY_ADDRESS,
          abi: glitchRegistryABI,
          functionName: 'upvote',
          args: [BigInt(glitch.onchain_glitch_id)],
          account: address,
        });
        writeUpvote(request);
      } else {
        writeUpvote({
          address: GLITCH_REGISTRY_ADDRESS,
          abi: glitchRegistryABI,
          functionName: 'upvote',
          args: [BigInt(glitch.onchain_glitch_id)],
        });
      }
    } catch (upvoteError) {
      console.error('Upvote error:', upvoteError);
      setError('Vote failed. Try again.');
    }
  };

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmError,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: upvoteWriteTxHash,
    chainId: targetChainId,
    timeout: 120_000,
  });

  useEffect(() => {
    if (isConfirmed) {
      refetchVoteCount();
      refetchHasVoted();
    }
  }, [isConfirmed, refetchVoteCount, refetchHasVoted]);

  useEffect(() => {
    if (!isConfirmed || !upvoteWriteTxHash) return;

    setVoteToastTxHash(upvoteWriteTxHash);
    try {
      navigator.vibrate?.(20);
    } catch {
      // ignore
    }

    setCelebrate('vote');
    const celebrateTimeout = window.setTimeout(() => setCelebrate(null), 900);
    const timeout = window.setTimeout(() => setVoteToastTxHash(null), 2200);

    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(celebrateTimeout);
    };
  }, [isConfirmed, upvoteWriteTxHash]);

  useEffect(() => {
    if (!isConfirmError || !confirmError) return;
    console.error('Upvote confirmation error:', confirmError);
    setError(`Vote confirmation failed. Please check you're on ${targetChainLabel}.`);
  }, [isConfirmError, confirmError, targetChainLabel]);

  useEffect(() => {
    if (!upvoteWriteError) return;
    const message = upvoteWriteError.message || 'Transaction failed';
    if (message.includes('Already voted')) {
      setError('You already voted for this post.');
    } else if (message.includes('User rejected') || message.includes('user rejected')) {
      setError('Transaction canceled.');
    } else {
      setError('Vote failed. Try again.');
    }
    resetUpvoteWrite();
  }, [upvoteWriteError, resetUpvoteWrite]);

  const handleStamp = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError('Connect your wallet to stamp.');
      return;
    }

    if (!glitch) {
      setError('Glitch not found.');
      return;
    }

    if (!glitch.stamp_hash) {
      setError('stampHash is not ready for this post.');
      return;
    }

    if (!GLITCH_STAMP_ADDRESS) {
      setError('Stamp contract is missing.');
      return;
    }

    if (chainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
      } catch (switchError) {
        console.error('Network switch error:', switchError);
        setError(`Please switch your wallet to ${targetChainLabel}.`);
        return;
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const uri = `${baseUrl}/glitch/${glitch.id}`;

    try {
      writeStamp({
        address: GLITCH_STAMP_ADDRESS,
        abi: glitchStampABI,
        functionName: 'stamp',
        args: [glitch.stamp_hash as `0x${string}`, uri],
      });
    } catch (stampError) {
      console.error('Stamp error:', stampError);
      setError('Stamp failed. Try again.');
    }
  };

  const {
    isLoading: isStampConfirming,
    isSuccess: isStampConfirmed,
    isError: isStampConfirmError,
    error: stampConfirmError,
  } = useWaitForTransactionReceipt({
    hash: stampWriteTxHash,
    chainId: targetChainId,
    timeout: 180_000,
  });

  useEffect(() => {
    if (!isStampConfirmError || !stampConfirmError) return;
    console.error('Stamp confirmation error:', stampConfirmError);
    setError(`Stamp confirmation failed. Please check you're on ${targetChainLabel}.`);
  }, [isStampConfirmError, stampConfirmError, targetChainLabel]);

  useEffect(() => {
    if (!isStampConfirmed || !stampWriteTxHash || !glitch) return;

    const confirm = async () => {
      try {
        await fetch('/api/stamp/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            glitchId: glitch.id,
            txHash: stampWriteTxHash,
          }),
        });
      } catch (confirmError) {
        console.error('Stamp confirm error:', confirmError);
      } finally {
        setStampTxHash(stampWriteTxHash);
        router.refresh();
      }
    };

    confirm();
  }, [isStampConfirmed, stampWriteTxHash, glitch, router]);

  useEffect(() => {
    if (!isStampConfirmed || !stampWriteTxHash) return;

    setStampToastTxHash(stampWriteTxHash);
    try {
      navigator.vibrate?.([20, 40, 20]);
    } catch {
      // ignore
    }

    setCelebrate('stamp');
    const celebrateTimeout = window.setTimeout(() => setCelebrate(null), 1000);
    const toastTimeout = window.setTimeout(() => setStampToastTxHash(null), 2400);

    return () => {
      window.clearTimeout(celebrateTimeout);
      window.clearTimeout(toastTimeout);
    };
  }, [isStampConfirmed, stampWriteTxHash]);

  useEffect(() => {
    if (!stampWriteError) return;
    const message = stampWriteError.message || 'Transaction failed';
    if (message.includes('User rejected') || message.includes('user rejected')) {
      setError('Transaction canceled.');
    } else if (message.includes('Already stamped')) {
      setError('This post is already stamped.');
    } else {
      setError(`Stamp failed: ${message.slice(0, 120)}`);
    }
    resetStampWrite();
  }, [stampWriteError, resetStampWrite]);

  if (!glitch) {
    return (
      <div className="page">
        <Header actionText="Submit" actionHref="/submit" />
        <main className="page-main">
          <p>Glitch not found.</p>
          <Link href="/" className="page-back-link">
            Back to list
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const tags = glitch.tags ? glitch.tags.split(',').map((tag) => tag.trim()) : [];
  const voteCountDisplay = displayVoteCount ?? (voteCount != null ? Number(voteCount) : 0);
  const voteButtonLabel = voteToastTxHash
    ? 'Voted!'
    : isUpvotePending
    ? 'Confirm in wallet'
    : isConfirming
    ? 'Confirming...'
    : hasVoted
    ? 'Voted'
    : '▲ Vote';
  const stampButtonLabel = isStampPending
    ? 'Confirm in wallet'
    : isStampConfirming
    ? 'Confirming...'
    : 'Stamp on Base';
  const voteStatusTxLink = upvoteWriteTxHash ? `${basescanBaseUrl}/tx/${upvoteWriteTxHash}` : null;
  const stampStatusTxLink = stampWriteTxHash ? `${basescanBaseUrl}/tx/${stampWriteTxHash}` : null;

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
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
              {glitch.video_url && !videoError ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={getYouTubeEmbedUrl(glitch.video_url) || ''}
                  title={glitch.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onError={() => setVideoError(true)}
                />
              ) : (
                <span>
                  {glitch.video_url ? 'Video unavailable.' : 'No video'}
                </span>
              )}
            </div>
            {glitch.video_url && videoError && (
              <div className="glitch-action__status">
                <a href={glitch.video_url} target="_blank" rel="noopener noreferrer">
                  Open original
                </a>
              </div>
            )}
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

            {error && <p className="glitch-form__error">{error}</p>}

            <section className="glitch-vote">
              <span className="glitch-vote__count">{voteCountDisplay}</span>
              <button
                type="button"
                className="glitch-vote__button"
                onClick={handleUpvote}
                disabled={
                  isUpvotePending ||
                  isConfirming ||
                  !!hasVoted ||
                  !isConnected ||
                  !!voteToastTxHash ||
                  !GLITCH_REGISTRY_ADDRESS
                }
                data-celebrate={voteToastTxHash ? 'true' : 'false'}
              >
                {voteButtonLabel}
              </button>
            </section>

            {isConnected && chainId !== targetChainId && (
              <div className="glitch-action__status">
                Current network: {currentChainLabel} (Voting/stamping requires {targetChainLabel})
              </div>
            )}
            {!isConnected && (
              <div className="glitch-action__status">Connect wallet to vote.</div>
            )}
            {!isConfirmed && voteStatusTxLink && (
              <div className="glitch-action__status">
                <span>Vote submitted. Waiting for confirmation...</span>
                <a href={voteStatusTxLink} target="_blank" rel="noopener noreferrer">
                  View tx
                </a>
              </div>
            )}

            <section className="glitch-vote" style={{ marginTop: 'var(--sp-sm)', flexWrap: 'wrap', gap: 'var(--sp-sm)' }}>
              <span
                className={`tag-badge${stampTxHash ? ' tag-badge--success' : ''}`}
                style={{ fontSize: '0.875rem' }}
              >
                {stampTxHash ? 'Stamped' : 'Not stamped'}
              </span>
              {stampTxHash ? (
                <a
                  className="glitch-vote__button"
                  href={`${basescanBaseUrl}/tx/${stampTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  View tx
                </a>
              ) : (
                <button
                  type="button"
                  className="glitch-vote__button"
                  onClick={handleStamp}
                  disabled={
                    !isConnected ||
                    !glitch.stamp_hash ||
                    !GLITCH_STAMP_ADDRESS ||
                    isStampPending ||
                    isStampConfirming ||
                    !!stampWriteTxHash
                  }
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {stampButtonLabel}
                </button>
              )}
            </section>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', margin: 'var(--sp-xs) 0 0' }}>
              Only a hash is stored on Base. Content stays offchain.
            </p>
            {!isStampConfirmed && stampStatusTxLink && !stampTxHash && (
              <div className="glitch-action__status">
                <span>Stamp submitted. Waiting for confirmation...</span>
                <a href={stampStatusTxLink} target="_blank" rel="noopener noreferrer">
                  View tx
                </a>
              </div>
            )}

            {glitch.stamp_hash && (
              <div
                style={{
                  marginTop: 'var(--sp-xs)',
                  display: 'flex',
                  gap: 'var(--sp-xs)',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>stampHash</span>
                <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{glitch.stamp_hash}</code>
                <button
                  type="button"
                  className="glitch-vote__button"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(glitch.stamp_hash!);
                    } catch (copyError) {
                      console.error('Copy error:', copyError);
                      setError('Failed to copy stampHash.');
                    }
                  }}
                >
                  Copy
                </button>
              </div>
            )}

            {/* Discovery Proof Section */}
            <section className="discovery-proof-section">
              <h3 className="discovery-proof-section__title">Discovery Proof</h3>
              <p className="discovery-proof-section__desc">This glitch was first reported by the address below. The timestamp proves the discovery.</p>
              <DiscoveryBadge
                authorAddress={glitch.author_address}
                createdAt={glitch.created_at || new Date()}
                stampTxHash={glitch.stamp_tx_hash}
              />
            </section>
          </div>
        </section>

        <div className="glitch-detail__nav">
          {prevGlitchId ? (
            <Link href={`/glitch/${prevGlitchId}`} className="pagination__link">
              Previous
            </Link>
          ) : null}
          {nextGlitchId ? (
            <Link href={`/glitch/${nextGlitchId}`} className="pagination__link">
              Next glitch
            </Link>
          ) : null}
          <Link
            href={`/glitch/random?excludeId=${glitch.id}&game=${encodeURIComponent(glitch.game_name)}`}
            className="pagination__link"
          >
            Random
          </Link>
        </div>

        {relatedGlitches.length > 0 && (
          <section className="glitch-related">
            <h3 className="glitch-related__title">More glitches in {glitch.game_name}</h3>
            <div className="glitch-list">
              {relatedGlitches.map((related) => (
                <GlitchCard key={related.id} glitch={related} compact />
              ))}
            </div>
          </section>
        )}
      </main>
      {celebrate && (
        <CelebrationBurst
          variant={celebrate}
          label={celebrate === 'vote' ? 'Vote complete' : 'Stamp complete'}
        />
      )}
      {voteToastTxHash && (
        <div className="toast" role="status" aria-live="polite">
          <span>Voted</span>
          <a href={`${basescanBaseUrl}/tx/${voteToastTxHash}`} target="_blank" rel="noopener noreferrer" className="toast__link">
            View tx
          </a>
        </div>
      )}
      {stampToastTxHash && (
        <div className="toast" role="status" aria-live="polite">
          <span>Stamped</span>
          <a href={`${basescanBaseUrl}/tx/${stampToastTxHash}`} target="_blank" rel="noopener noreferrer" className="toast__link">
            View tx
          </a>
        </div>
      )}
      <Footer />
    </div>
  );
}
