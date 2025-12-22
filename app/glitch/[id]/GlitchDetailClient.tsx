'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import CelebrationBurst from '@/components/CelebrationBurst';
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
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const fallbackLang = envLang === 'en' || envLang === 'ja' ? envLang : '';
  const lang = (langParam === 'en' || langParam === 'ja' ? langParam : fallbackLang) || 'ja';
  const isEnglish = lang === 'en';
  const shouldIncludeLang = Boolean(langParam || fallbackLang);

  const withLang = (href: string) => {
    if (!shouldIncludeLang) return href;
    if (!href.startsWith('/') || href.includes('lang=')) return href;
    const [path, query] = href.split('?');
    const params = new URLSearchParams(query || '');
    params.set('lang', lang);
    return `${path}?${params.toString()}`;
  };

  const homeHref = withLang('/');
  const submitHref = withLang('/submit');

  const copy = useMemo(
    () =>
      isEnglish
        ? {
            headerAction: 'Submit',
            notFound: 'Glitch not found.',
            backToList: 'Back to list',
            labels: {
              game: 'Game',
              platform: 'Platform',
              hunter: 'Hunter',
              noVideo: 'No video',
              videoUnavailable: 'Video unavailable.',
              openVideo: 'Open original',
              vote: '▲ Vote',
              voted: 'Voted',
              voting: 'Confirming...',
              votingWallet: 'Confirm in wallet',
              voteDone: 'Voted!',
              networkStatus: (current: string, target: string) =>
                `Current network: ${current} (Voting/stamping requires ${target})`,
              connectToVote: 'Connect wallet to vote.',
              walletConfirm: 'Confirm in wallet.',
              stamped: 'Stamped',
              notStamped: 'Not stamped',
              viewTx: 'View tx',
              stamping: 'Confirming...',
              stampingWallet: 'Confirm in wallet',
              stampCta: 'Stamp on Base',
              stampInfo: 'Only a hash is stored on Base. Content stays offchain.',
              stampHash: 'stampHash',
              copy: 'Copy',
              related: (game: string) => `More glitches in ${game}`,
              voteSubmitted: 'Vote submitted. Waiting for confirmation...',
              stampSubmitted: 'Stamp submitted. Waiting for confirmation...',
              toastVote: 'Voted',
              toastStamp: 'Stamped',
              celebrateVote: 'Vote complete',
              celebrateStamp: 'Stamp complete',
              prevGlitch: 'Previous',
              nextGlitch: 'Next glitch',
              randomGlitch: 'Random',
            },
            errors: {
              walletRequiredVote: 'Connect your wallet to vote.',
              postNotFound: 'Glitch not found.',
              contractMissing: 'Contract address is missing.',
              alreadyVoted: 'You already voted for this post.',
              switchNetwork: (label: string) => `Please switch your wallet to ${label}.`,
              voteFailed: 'Vote failed. Try again.',
              voteConfirmFailed: (label: string) =>
                `Vote confirmation failed. Please check you're on ${label}.`,
              walletRequiredStamp: 'Connect your wallet to stamp.',
              stampHashMissing: 'stampHash is not ready for this post.',
              stampContractMissing: 'Stamp contract is missing.',
              stampFailed: 'Stamp failed. Try again.',
              stampConfirmFailed: (label: string) =>
                `Stamp confirmation failed. Please check you're on ${label}.`,
              txCanceled: 'Transaction canceled.',
              alreadyStamped: 'This post is already stamped.',
              stampFailedWithMessage: (message: string) => `Stamp failed: ${message}`,
              copyFailed: 'Failed to copy stampHash.',
            },
          }
        : {
            headerAction: '投稿する',
            notFound: '投稿が見つかりません。',
            backToList: '一覧に戻る',
            labels: {
              game: 'ゲーム',
              platform: '機種',
              hunter: '発見者',
              noVideo: '動画なし',
              videoUnavailable: '動画を再生できません。',
              openVideo: '元の動画を開く',
              vote: '▲ 投票',
              voted: '投票済み',
              voting: '確定中...',
              votingWallet: 'ウォレットで承認',
              voteDone: '投票完了！',
              networkStatus: (current: string, target: string) =>
                `現在のネットワーク: ${current}（投票/スタンプは${target}が必要）`,
              connectToVote: '投票するにはウォレット接続が必要です。',
              walletConfirm: 'ウォレットで承認してください。',
              stamped: '刻印済み',
              notStamped: '未スタンプ',
              viewTx: 'Txを見る',
              stamping: '確定中...',
              stampingWallet: 'ウォレットで承認',
              stampCta: 'Baseにスタンプ',
              stampInfo: 'Baseにはハッシュだけ保存。内容はオフチェーンのままです。',
              stampHash: 'stampHash',
              copy: 'コピー',
              related: (game: string) => `${game} の他のバグ`,
              voteSubmitted: '投票を送信しました。確定待ち...',
              stampSubmitted: 'スタンプを送信しました。確定待ち...',
              toastVote: '投票しました',
              toastStamp: 'スタンプしました',
              celebrateVote: '投票完了',
              celebrateStamp: 'スタンプ完了',
              prevGlitch: '前のグリッチ',
              nextGlitch: '次のグリッチ',
              randomGlitch: 'ランダム',
            },
            errors: {
              walletRequiredVote: '投票するにはウォレット接続が必要です。',
              postNotFound: '投稿が見つかりません。',
              contractMissing: 'コントラクトアドレスが未設定です。',
              alreadyVoted: 'この投稿には投票済みです。',
              switchNetwork: (label: string) => `ウォレットを${label}に切り替えてください。`,
              voteFailed: '投票に失敗しました。もう一度お試しください。',
              voteConfirmFailed: (label: string) =>
                `投票の確定に失敗しました。${label}か確認してください。`,
              walletRequiredStamp: 'スタンプするにはウォレット接続が必要です。',
              stampHashMissing: 'この投稿のstampHashがまだ生成されていません。',
              stampContractMissing: 'スタンプ用コントラクトが未設定です。',
              stampFailed: 'スタンプに失敗しました。もう一度お試しください。',
              stampConfirmFailed: (label: string) =>
                `スタンプの確定に失敗しました。${label}か確認してください。`,
              txCanceled: 'トランザクションがキャンセルされました。',
              alreadyStamped: 'この投稿は既にスタンプ済みです。',
              stampFailedWithMessage: (message: string) => `スタンプに失敗しました: ${message}`,
              copyFailed: 'stampHashのコピーに失敗しました。',
            },
          },
    [isEnglish]
  );

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

  const targetChainId = process.env.NEXT_PUBLIC_CHAIN === 'sepolia' ? baseSepolia.id : base.id;
  const basescanBaseUrl =
    process.env.NEXT_PUBLIC_CHAIN === 'sepolia' ? 'https://sepolia.basescan.org' : 'https://basescan.org';
  const targetChainLabel = targetChainId === baseSepolia.id ? 'Base Sepolia' : 'Base mainnet';
  const currentChainLabel =
    chainId === base.id
      ? 'Base mainnet'
      : chainId === baseSepolia.id
      ? 'Base Sepolia'
      : chainId === 1
      ? 'Ethereum mainnet'
      : `chainId ${chainId}`;

  const { writeContract: writeUpvote, data: upvoteWriteTxHash, isPending: isUpvotePending } = useWriteContract();
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
      setError(copy.errors.walletRequiredVote);
      return;
    }

    if (!glitch) {
      setError(copy.errors.postNotFound);
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError(copy.errors.contractMissing);
      return;
    }

    if (hasVoted) {
      setError(copy.errors.alreadyVoted);
      return;
    }

    if (chainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
      } catch (switchError) {
        console.error('Network switch error:', switchError);
        setError(copy.errors.switchNetwork(targetChainLabel));
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
    } catch (upvoteError) {
      console.error('Upvote error:', upvoteError);
      setError(copy.errors.voteFailed);
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
    setError(copy.errors.voteConfirmFailed(targetChainLabel));
  }, [isConfirmError, confirmError, targetChainLabel, copy.errors]);

  const handleStamp = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError(copy.errors.walletRequiredStamp);
      return;
    }

    if (!glitch) {
      setError(copy.errors.postNotFound);
      return;
    }

    if (!glitch.stamp_hash) {
      setError(copy.errors.stampHashMissing);
      return;
    }

    if (!GLITCH_STAMP_ADDRESS) {
      setError(copy.errors.stampContractMissing);
      return;
    }

    if (chainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId });
      } catch (switchError) {
        console.error('Network switch error:', switchError);
        setError(copy.errors.switchNetwork(targetChainLabel));
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
      setError(copy.errors.stampFailed);
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
    setError(copy.errors.stampConfirmFailed(targetChainLabel));
  }, [isStampConfirmError, stampConfirmError, targetChainLabel, copy.errors]);

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
      setError(copy.errors.txCanceled);
    } else if (message.includes('Already stamped')) {
      setError(copy.errors.alreadyStamped);
    } else {
      setError(copy.errors.stampFailedWithMessage(message.slice(0, 120)));
    }
    resetStampWrite();
  }, [stampWriteError, resetStampWrite, copy.errors]);

  if (!glitch) {
    return (
      <div className="page">
        <Header actionText={copy.headerAction} actionHref={submitHref} />
        <main className="page-main">
          <p>{copy.notFound}</p>
          <Link href={homeHref} className="page-back-link">
            {copy.backToList}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const tags = glitch.tags ? glitch.tags.split(',').map((tag) => tag.trim()) : [];
  const voteCountDisplay = displayVoteCount ?? (voteCount != null ? Number(voteCount) : 0);
  const voteButtonLabel = voteToastTxHash
    ? copy.labels.voteDone
    : isUpvotePending
    ? copy.labels.votingWallet
    : isConfirming
    ? copy.labels.voting
    : hasVoted
    ? copy.labels.voted
    : copy.labels.vote;
  const stampButtonLabel = isStampPending
    ? copy.labels.stampingWallet
    : isStampConfirming
    ? copy.labels.stamping
    : copy.labels.stampCta;
  const voteStatusTxLink = upvoteWriteTxHash ? `${basescanBaseUrl}/tx/${upvoteWriteTxHash}` : null;
  const stampStatusTxLink = stampWriteTxHash ? `${basescanBaseUrl}/tx/${stampWriteTxHash}` : null;

  return (
    <div className="page">
      <Header actionText={copy.headerAction} actionHref={submitHref} />
      <main className="page-main">
        <Link href={homeHref} className="page-back-link">
          {copy.backToList}
        </Link>

        <h1 className="glitch-detail__title">{glitch.title}</h1>

        <div className="glitch-meta">
          <span>
            {copy.labels.game}: {glitch.game_name}
          </span>
          <span>
            {copy.labels.platform}: {glitch.platform}
          </span>
          <span>
            {copy.labels.hunter}: {glitch.author_address}
          </span>
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
                  {glitch.video_url ? copy.labels.videoUnavailable : copy.labels.noVideo}
                </span>
              )}
            </div>
            {glitch.video_url && videoError && (
              <div className="glitch-action__status">
                <a href={glitch.video_url} target="_blank" rel="noopener noreferrer">
                  {copy.labels.openVideo}
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
                {copy.labels.networkStatus(currentChainLabel, targetChainLabel)}
              </div>
            )}
            {!isConnected && (
              <div className="glitch-action__status">{copy.labels.connectToVote}</div>
            )}
            {!isConfirmed && voteStatusTxLink && (
              <div className="glitch-action__status">
                <span>{copy.labels.voteSubmitted}</span>
                <a href={voteStatusTxLink} target="_blank" rel="noopener noreferrer">
                  {copy.labels.viewTx}
                </a>
              </div>
            )}

            <section className="glitch-vote" style={{ marginTop: 'var(--sp-sm)', flexWrap: 'wrap', gap: 'var(--sp-sm)' }}>
              <span
                className={`tag-badge${stampTxHash ? ' tag-badge--success' : ''}`}
                style={{ fontSize: '0.875rem' }}
              >
                {stampTxHash ? copy.labels.stamped : copy.labels.notStamped}
              </span>
              {stampTxHash ? (
                <a
                  className="glitch-vote__button"
                  href={`${basescanBaseUrl}/tx/${stampTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {copy.labels.viewTx}
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
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.875rem', margin: 'var(--sp-xs) 0 0' }}>
              {copy.labels.stampInfo}
            </p>
            {!isStampConfirmed && stampStatusTxLink && !stampTxHash && (
              <div className="glitch-action__status">
                <span>{copy.labels.stampSubmitted}</span>
                <a href={stampStatusTxLink} target="_blank" rel="noopener noreferrer">
                  {copy.labels.viewTx}
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
                <span style={{ color: 'var(--c-text-muted)', fontSize: '0.875rem' }}>{copy.labels.stampHash}</span>
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
                      setError(copy.errors.copyFailed);
                    }
                  }}
                >
                  {copy.labels.copy}
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="glitch-detail__nav">
          {prevGlitchId ? (
            <Link href={withLang(`/glitch/${prevGlitchId}`)} className="pagination__link">
              {copy.labels.prevGlitch}
            </Link>
          ) : null}
          {nextGlitchId ? (
            <Link href={withLang(`/glitch/${nextGlitchId}`)} className="pagination__link">
              {copy.labels.nextGlitch}
            </Link>
          ) : null}
          <Link
            href={withLang(`/glitch/random?excludeId=${glitch.id}&game=${encodeURIComponent(glitch.game_name)}`)}
            className="pagination__link"
          >
            {copy.labels.randomGlitch}
          </Link>
        </div>

        {relatedGlitches.length > 0 && (
          <section className="glitch-related">
            <h3 className="glitch-related__title">{copy.labels.related(glitch.game_name)}</h3>
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
          label={celebrate === 'vote' ? copy.labels.celebrateVote : copy.labels.celebrateStamp}
        />
      )}
      {voteToastTxHash && (
        <div className="toast" role="status" aria-live="polite">
          <span>{copy.labels.toastVote}</span>
          <a href={`${basescanBaseUrl}/tx/${voteToastTxHash}`} target="_blank" rel="noopener noreferrer" className="toast__link">
            {copy.labels.viewTx}
          </a>
        </div>
      )}
      {stampToastTxHash && (
        <div className="toast" role="status" aria-live="polite">
          <span>{copy.labels.toastStamp}</span>
          <a href={`${basescanBaseUrl}/tx/${stampToastTxHash}`} target="_blank" rel="noopener noreferrer" className="toast__link">
            {copy.labels.viewTx}
          </a>
        </div>
      )}
      <Footer />
    </div>
  );
}
