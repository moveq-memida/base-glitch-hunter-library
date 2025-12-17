'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import CelebrationBurst from '@/components/CelebrationBurst';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS, glitchStampABI, GLITCH_STAMP_ADDRESS } from '@/lib/contracts';

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
}

export default function GlitchDetailClient({ glitch, relatedGlitches = [] }: GlitchDetailClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [stampTxHash, setStampTxHash] = useState<string | null>(glitch?.stamp_tx_hash || null);
  const [voteToastTxHash, setVoteToastTxHash] = useState<`0x${string}` | null>(null);
  const [stampToastTxHash, setStampToastTxHash] = useState<`0x${string}` | null>(null);
  const [celebrate, setCelebrate] = useState<null | 'vote' | 'stamp'>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const targetChainId = process.env.NEXT_PUBLIC_CHAIN === 'sepolia' ? baseSepolia.id : base.id;
  const basescanBaseUrl = process.env.NEXT_PUBLIC_CHAIN === 'sepolia' ? 'https://sepolia.basescan.org' : 'https://basescan.org';
  const targetChainLabel = targetChainId === baseSepolia.id ? 'Base Sepolia' : 'Base mainnet';
  const currentChainLabel =
    chainId === base.id ? 'Base mainnet' : chainId === baseSepolia.id ? 'Base Sepolia' : chainId === 1 ? 'Ethereum mainnet' : `chainId ${chainId}`;

  const { writeContract: writeUpvote, data: upvoteWriteTxHash, isPending: isUpvotePending } = useWriteContract();
  const {
    writeContract: writeStamp,
    data: stampWriteTxHash,
    isPending: isStampPending,
    error: stampWriteError,
    reset: resetStampWrite,
  } = useWriteContract();

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
  const { data: hasVoted, refetch: refetchHasVoted } = useReadContract({
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
      setError('投票するにはウォレット接続が必要です。');
      return;
    }

    if (!glitch) {
      setError('投稿が見つかりません。');
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError('コントラクトが未設定です。');
      return;
    }

    if (hasVoted) {
      setError('この投稿には投票済みです。');
      return;
    }

    if (chainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
      } catch (switchError) {
        console.error('Network switch error:', switchError);
        setError(`ウォレットを${targetChainLabel}に切り替えてください。`);
        return;
      }
    }

    try {
      writeUpvote({
        address: GLITCH_REGISTRY_ADDRESS,
        abi: glitchRegistryABI,
        functionName: 'upvote',
        args: [BigInt(glitch.onchain_glitch_id)],
      });
    } catch (error) {
      console.error('Upvote error:', error);
      setError('投票に失敗しました。もう一度お試しください。');
    }
  };

  // Wait for transaction and refetch vote count
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

  React.useEffect(() => {
    if (isConfirmed) {
      refetchVoteCount();
      refetchHasVoted();
    }
  }, [isConfirmed, refetchVoteCount, refetchHasVoted]);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!isConfirmError || !confirmError) return;
    console.error('Upvote confirmation error:', confirmError);
    setError(`投票の確定に失敗しました。ネットワークが${targetChainLabel}か確認してください。`);
  }, [isConfirmError, confirmError, targetChainLabel]);

  const handleStamp = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError('スタンプするにはウォレット接続が必要です。');
      return;
    }

    if (!glitch) {
      setError('投稿が見つかりません。');
      return;
    }

    if (!glitch.stamp_hash) {
      setError('この投稿のstampHashがまだ生成されていません。');
      return;
    }

    if (!GLITCH_STAMP_ADDRESS) {
      setError('スタンプ用コントラクトが未設定です。');
      return;
    }

    if (chainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
      } catch (switchError) {
        console.error('Network switch error:', switchError);
        setError('ウォレットをBase mainnetに切り替えてください。');
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
      setError('スタンプに失敗しました。もう一度お試しください。');
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

  React.useEffect(() => {
    if (!isStampConfirmError || !stampConfirmError) return;
    console.error('Stamp confirmation error:', stampConfirmError);
    setError(`スタンプの確定に失敗しました。ネットワークが${targetChainLabel}か確認してください。`);
  }, [isStampConfirmError, stampConfirmError, targetChainLabel]);

  React.useEffect(() => {
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

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (stampWriteError) {
      const message = stampWriteError.message || 'Transaction failed';
      if (message.includes('User rejected') || message.includes('user rejected')) {
        setError('トランザクションがキャンセルされました。');
      } else if (message.includes('Already stamped')) {
        setError('この投稿は既にスタンプ済みです。');
      } else {
        setError(`スタンプに失敗しました: ${message.slice(0, 120)}`);
      }
      resetStampWrite();
    }
  }, [stampWriteError, resetStampWrite]);

  if (!glitch) {
    return (
      <div className="page">
        <Header />
        <main className="page-main">
          <p>投稿が見つかりません。</p>
          <Link href="/" className="page-back-link">
            一覧に戻る
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
          一覧に戻る
        </Link>

        <h1 className="glitch-detail__title">{glitch.title}</h1>

        <div className="glitch-meta">
          <span>ゲーム: {glitch.game_name}</span>
          <span>機種: {glitch.platform}</span>
          <span>発見者: {glitch.author_address}</span>
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
                <span>動画なし</span>
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
                disabled={isUpvotePending || isConfirming || !!hasVoted || !isConnected || !!voteToastTxHash}
                data-celebrate={voteToastTxHash ? 'true' : 'false'}
              >
                {voteToastTxHash
                  ? '投票完了！'
                  : isUpvotePending || isConfirming
                  ? '投票中...'
                  : hasVoted
                  ? '投票済み'
                  : '▲ 投票'}
              </button>
            </section>
            {isConnected && chainId !== targetChainId && (
              <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>
                現在のネットワーク: {currentChainLabel}（投票/スタンプは {targetChainLabel} が必要です）
              </p>
            )}
            {!isConnected && (
              <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>
                投票するにはウォレット接続が必要です。
              </p>
            )}

            <section className="glitch-vote" style={{ marginTop: 'var(--sp-sm)', flexWrap: 'wrap', gap: 'var(--sp-sm)' }}>
              <span
                className={`tag-badge${stampTxHash ? ' tag-badge--success' : ''}`}
                style={{
                  fontSize: '0.875rem',
                }}
              >
                {stampTxHash ? '刻印済み' : '未スタンプ'}
              </span>
              {stampTxHash ? (
                <a
                  className="glitch-vote__button"
                  href={`${basescanBaseUrl}/tx/${stampTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Txを見る
                </a>
              ) : (
                <button
                  type="button"
                  className="glitch-vote__button"
                  onClick={handleStamp}
                  disabled={!isConnected || !glitch.stamp_hash || !GLITCH_STAMP_ADDRESS || isStampPending || isStampConfirming}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isStampPending || isStampConfirming ? 'スタンプ中...' : 'Baseにスタンプ'}
                </button>
              )}
            </section>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.875rem', margin: 'var(--sp-xs) 0 0' }}>
              スタンプすると、この投稿が“存在した証拠（ハッシュ）”としてBaseに残ります。内容はオンチェーンに載りません。
            </p>

            {glitch.stamp_hash && (
              <div style={{ marginTop: 'var(--sp-xs)', display: 'flex', gap: 'var(--sp-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--c-text-muted)', fontSize: '0.875rem' }}>stampHash</span>
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
                      setError('stampHashのコピーに失敗しました。');
                    }
                  }}
                >
                  コピー
                </button>
              </div>
            )}
          </div>
        </section>

        {relatedGlitches.length > 0 && (
          <section className="glitch-related">
            <h3 className="glitch-related__title">{glitch.game_name} の他のバグ</h3>
            <div className="glitch-list">
              {relatedGlitches.map((related) => (
                <GlitchCard key={related.id} glitch={related} compact />
              ))}
            </div>
          </section>
        )}
      </main>
      {celebrate && <CelebrationBurst variant={celebrate} />}
      {voteToastTxHash && (
        <div className="toast" role="status" aria-live="polite">
          <span>投票しました</span>
          <a href={`${basescanBaseUrl}/tx/${voteToastTxHash}`} target="_blank" rel="noopener noreferrer" className="toast__link">
            Txを見る
          </a>
        </div>
      )}
      {stampToastTxHash && (
        <div className="toast" role="status" aria-live="polite">
          <span>スタンプしました</span>
          <a href={`${basescanBaseUrl}/tx/${stampToastTxHash}`} target="_blank" rel="noopener noreferrer" className="toast__link">
            Txを見る
          </a>
        </div>
      )}
      <Footer />
    </div>
  );
}
