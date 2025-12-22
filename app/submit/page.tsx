'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { keccak256, toBytes, decodeEventLog } from 'viem';
import { base } from 'wagmi/chains';
import Header from '@/components/Header';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

export default function SubmitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const fallbackLang = envLang === 'en' || envLang === 'ja' ? envLang : '';
  const lang = (langParam === 'en' || langParam === 'ja' ? langParam : fallbackLang) || 'ja';
  const isEnglish = lang === 'en';
  const shouldIncludeLang = Boolean(langParam || fallbackLang);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tagsValue, setTagsValue] = useState('');

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const targetChainLabel = 'Base mainnet';

  const copy = isEnglish
    ? {
        headerBack: 'Back',
        title: 'Submit a glitch',
        intro: 'Share a glitch you found. Short repro steps help the most.',
        fields: {
          title: 'Title',
          game: 'Game name',
          platform: 'Platform',
          video: 'Video URL (YouTube etc.)',
          description: 'Description & reproduction steps',
          tags: 'Tags',
        },
        placeholders: {
          title: 'e.g. Rolling into a wall makes you fall through',
          game: 'e.g. Pokemon Diamond / Pearl',
          video: 'https://...',
          description: '1. Go to...\n2. Do...\n3. It happens...',
          tags: 'e.g. pokemon,void,glitch',
        },
        hints: {
          title: 'Keep it short. Include the trigger.',
          game: 'Use the official game name when possible.',
          platform: 'Pick the platform where it happens.',
          video: 'Optional. Paste a link.',
          description: 'Short, numbered steps help.',
          tags: 'Comma-separated. Optional (English tags recommended).',
        },
        tagSuggestions: 'Popular tags',
        badges: {
          required: 'Required',
          optional: 'Optional',
        },
        connect: {
          connecting: 'Connecting...',
          cta: 'Connect wallet to submit',
          connected: 'Connected',
        },
        submit: {
          submitting: 'Submitting...',
          cta: 'Submit',
          ctaDisconnected: 'Connect wallet in header',
          connectHint: 'Connect your wallet in the header to submit.',
        },
        networkWarning: 'Network is not Base. Switch to Base mainnet.',
        errors: {
          noWallet: 'Wallet not found. Install MetaMask or another wallet.',
          connectFailed: 'Wallet connection failed. Try again.',
          connectFirst: 'Connect your wallet first.',
          contractMissing: 'Contract address is missing.',
          switchNetwork: `Please switch your wallet to ${targetChainLabel}.`,
          submitFailed: 'Submit failed. Try again.',
          confirmFailed: 'Transaction confirmation failed. Check your wallet.',
          saveFailed: 'Onchain submit succeeded, but saving failed.',
          txCanceled: 'Transaction canceled.',
          insufficientFunds: 'Not enough gas.',
          transactionFailed: (message: string) => `Transaction failed: ${message}`,
        },
        validation: {
          required: 'This field is required.',
          invalidUrl: 'Enter a valid URL (https://...)',
        },
      }
    : {
        headerBack: '戻る',
        title: 'バグを投稿する',
        intro: '見つけたバグを投稿します。短い再現手順があると助かります。',
        fields: {
          title: 'タイトル',
          game: 'ゲーム名',
          platform: '機種',
          video: '動画URL（YouTubeなど）',
          description: '説明・再現手順',
          tags: 'タグ',
        },
        placeholders: {
          title: '例：壁に当たり続けると落下する',
          game: '例：ポケモン ダイヤモンド / パール',
          video: 'https://...',
          description: '1. 目的地へ行く\n2. 操作する\n3. 発生する',
          tags: '例：pokemon,void,glitch',
        },
        hints: {
          title: '短く具体的に。発生条件を書くと伝わります。',
          game: '正式名称推奨。',
          platform: '発生した機種を選択。',
          video: '任意。URLを貼るだけでOK。',
          description: '短い再現手順があると助かります。',
          tags: 'カンマ区切り。任意（英語タグ推奨）。',
        },
        tagSuggestions: '人気タグ',
        badges: {
          required: '必須',
          optional: '任意',
        },
        connect: {
          connecting: '接続中...',
          cta: 'ウォレットを接続して投稿',
          connected: '接続済み',
        },
        submit: {
          submitting: '送信中...',
          cta: '投稿する',
          ctaDisconnected: 'ヘッダーで接続して投稿',
          connectHint: '投稿するにはヘッダーでウォレットを接続してください。',
        },
        networkWarning: `ネットワークがBaseではありません。${targetChainLabel}に切り替えてください。`,
        errors: {
          noWallet: 'ウォレットが見つかりません。MetaMaskなどをインストールしてください。',
          connectFailed: 'ウォレット接続に失敗しました。もう一度お試しください。',
          connectFirst: 'まずウォレットを接続してください。',
          contractMissing: 'コントラクトが未設定です。',
          switchNetwork: `ウォレットを${targetChainLabel}に切り替えてください。`,
          submitFailed: '投稿に失敗しました。もう一度お試しください。',
          confirmFailed: 'トランザクションの確定に失敗しました。ウォレットを確認してください。',
          saveFailed: 'オンチェーンへの投稿は完了しましたが、保存に失敗しました。',
          txCanceled: 'トランザクションがキャンセルされました。',
          insufficientFunds: 'ガス代が不足しています。',
          transactionFailed: (message: string) => `トランザクションに失敗しました: ${message}`,
        },
        validation: {
          required: '必須項目です。',
          invalidUrl: '正しいURLを入力してください（https://...）。',
        },
      };

  const homeHref = shouldIncludeLang ? `/?lang=${lang}` : '/';
  const detailSuffix = shouldIncludeLang ? `?lang=${lang}` : '';
  const tagSuggestions = [
    'outofbounds',
    'softlock',
    'sequencebreak',
    'wallclip',
    'speedrun',
    'skip',
    'duplication',
    'collision',
    'physics',
    'ui',
  ];
  const requiredFields = new Set(['title', 'game', 'description']);

  const parseTags = (value: string) =>
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

  const validateField = (name: string, value: string) => {
    const trimmed = value.trim();
    if (requiredFields.has(name) && !trimmed) {
      return copy.validation.required;
    }
    if (name === 'video' && trimmed) {
      try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return copy.validation.invalidUrl;
        }
      } catch {
        return copy.validation.invalidUrl;
      }
    }
    return '';
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagsValue(e.currentTarget.value);
    handleFieldChange(e);
  };

  const handleFieldBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.currentTarget;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.currentTarget;
    if (!touched[name]) return;
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleTagSuggestionClick = (tag: string) => {
    const currentTags = parseTags(tagsValue);
    const lowerTag = tag.toLowerCase();
    const nextTags = currentTags.filter(
      (current) => current.toLowerCase() !== lowerTag
    );
    const isSelected = nextTags.length !== currentTags.length;
    const nextValue = (isSelected ? nextTags : [...currentTags, tag]).join(', ');
    setTagsValue(nextValue);
    setTouched((prev) => ({ ...prev, tags: true }));
    setFieldErrors((prev) => ({ ...prev, tags: validateField('tags', nextValue) }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const metadata = {
      title: String(formData.get('title') || ''),
      game_name: String(formData.get('game') || ''),
      platform: String(formData.get('platform') || ''),
      video_url: String(formData.get('video') || ''),
      description: String(formData.get('description') || ''),
      tags: String(formData.get('tags') || ''),
    };

    const nextErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries({
      title: metadata.title,
      game: metadata.game_name,
      video: metadata.video_url,
      description: metadata.description,
      tags: metadata.tags,
    })) {
      const message = validateField(key, value);
      if (message) {
        nextErrors[key] = message;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      setTouched((prev) => ({
        ...prev,
        title: true,
        game: true,
        description: true,
        video: prev.video ?? Boolean(metadata.video_url.trim()),
        tags: prev.tags ?? Boolean(metadata.tags.trim()),
      }));
      return;
    }

    if (!isConnected || !address) {
      setError(copy.errors.connectFirst);
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError(copy.errors.contractMissing);
      return;
    }

    // Check if on correct network (Base mainnet)
    if (chainId !== base.id) {
      try {
        await switchChain({ chainId: base.id });
      } catch (error) {
        console.error('Network switch error:', error);
        setError(copy.errors.switchNetwork);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Calculate contentHash
      const metadataString = JSON.stringify(metadata);
      const contentHash = keccak256(toBytes(metadataString));

      // 2. Call submitGlitch on contract
      writeContract({
        address: GLITCH_REGISTRY_ADDRESS,
        abi: glitchRegistryABI,
        functionName: 'submitGlitch',
        args: [contentHash],
      });

      // Note: Transaction handling continues in useEffect below
    } catch (error) {
      console.error('Submit error:', error);
      setError(copy.errors.submitFailed);
      setIsSubmitting(false);
    }
  };

  // Wait for transaction and save to database
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle transaction confirmation errors
  React.useEffect(() => {
    if (isConfirmError && confirmError) {
      console.error('Transaction confirmation error:', confirmError);
      setError(copy.errors.confirmFailed);
      setIsSubmitting(false);
    }
  }, [isConfirmError, confirmError]);

  // Handle transaction success
  React.useEffect(() => {
    if (isConfirmed && hash && receipt) {
      const saveToDatabase = async () => {
        try {
          // Get the glitch ID from the transaction receipt logs
          let onchainGlitchId = 0;

          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: glitchRegistryABI,
                data: log.data,
                topics: log.topics,
              });

              if (decoded.eventName === 'GlitchSubmitted' && decoded.args) {
                const args = decoded.args as unknown as { glitchId: bigint };
                onchainGlitchId = Number(args.glitchId);
                break;
              }
            } catch {
              // Not our event, continue
            }
          }

          const formElement = document.querySelector('form') as HTMLFormElement;
          if (!formElement) return;

          const formData = new FormData(formElement);
          const metadata = {
            title: formData.get('title') as string,
            game_name: formData.get('game') as string,
            platform: formData.get('platform') as string,
            video_url: formData.get('video') as string,
            description: formData.get('description') as string,
            tags: formData.get('tags') as string,
          };

          const metadataString = JSON.stringify(metadata);
          const contentHash = keccak256(toBytes(metadataString));

          // Save to database
          const response = await fetch('/api/glitches', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...metadata,
              author_address: address,
              onchain_glitch_id: onchainGlitchId,
              content_hash: contentHash,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save to database');
          }

          const savedGlitch = await response.json();
          router.push(`/glitch/${savedGlitch.id}${detailSuffix}`);
        } catch (error) {
          console.error('Database save error:', error);
          setError(copy.errors.saveFailed);
          setIsSubmitting(false);
        }
      };

      saveToDatabase();
    }
  }, [isConfirmed, hash, address, router, receipt, detailSuffix]);

  React.useEffect(() => {
    if (isPending || isConfirming) {
      setIsSubmitting(true);
    }
  }, [isPending, isConfirming]);

  // Handle write contract errors
  React.useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);
      const errorMessage = writeError.message || 'Transaction failed';
      // Extract user-friendly message
      if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
        setError(copy.errors.txCanceled);
      } else if (errorMessage.includes('insufficient funds')) {
        setError(copy.errors.insufficientFunds);
      } else {
        setError(copy.errors.transactionFailed(errorMessage.slice(0, 100)));
      }
      setIsSubmitting(false);
      resetWrite();
    }
  }, [writeError, resetWrite]);

  const titleError = touched.title ? fieldErrors.title : '';
  const gameError = touched.game ? fieldErrors.game : '';
  const videoError = touched.video ? fieldErrors.video : '';
  const descriptionError = touched.description ? fieldErrors.description : '';
  const tagsError = touched.tags ? fieldErrors.tags : '';
  const selectedTags = new Set(
    parseTags(tagsValue).map((tag) => tag.toLowerCase())
  );

  return (
    <div className="page">
      <Header actionText={copy.headerBack} actionHref={homeHref} />
      <main className="page-main">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{copy.title}</h2>
        <p style={{ color: 'var(--c-text-muted)', marginBottom: '2rem' }}>
          {copy.intro}
        </p>
        <form className="glitch-form" onSubmit={handleSubmit}>
          <div className="glitch-form__field">
            <label htmlFor="title">
              {copy.fields.title}
              <span className="glitch-form__required">{copy.badges.required}</span>
            </label>
            <p className="glitch-form__hint" id="title-hint">
              {copy.hints.title}
            </p>
            <input
              type="text"
              id="title"
              name="title"
              placeholder={copy.placeholders.title}
              aria-describedby={`title-hint${titleError ? ' title-error' : ''}`}
              aria-invalid={Boolean(titleError)}
              onBlur={handleFieldBlur}
              onChange={handleFieldChange}
              required
            />
            {titleError && (
              <p className="glitch-form__error" id="title-error">
                {titleError}
              </p>
            )}
          </div>

          <div className="glitch-form__field">
            <label htmlFor="game">
              {copy.fields.game}
              <span className="glitch-form__required">{copy.badges.required}</span>
            </label>
            <p className="glitch-form__hint" id="game-hint">
              {copy.hints.game}
            </p>
            <input
              type="text"
              id="game"
              name="game"
              placeholder={copy.placeholders.game}
              aria-describedby={`game-hint${gameError ? ' game-error' : ''}`}
              aria-invalid={Boolean(gameError)}
              onBlur={handleFieldBlur}
              onChange={handleFieldChange}
              required
            />
            {gameError && (
              <p className="glitch-form__error" id="game-error">
                {gameError}
              </p>
            )}
          </div>

          <div className="glitch-form__field">
            <label htmlFor="platform">{copy.fields.platform}</label>
            <p className="glitch-form__hint" id="platform-hint">
              {copy.hints.platform}
            </p>
            <select id="platform" name="platform" aria-describedby="platform-hint">
              <option value="pc">PC / Steam</option>
              <option value="ps5">PlayStation 5</option>
              <option value="switch">Nintendo Switch</option>
              <option value="xbox">Xbox Series X/S</option>
              <option value="mobile">Mobile (iOS/Android)</option>
              <option value="retro">Retro Console</option>
            </select>
          </div>

          <div className="glitch-form__field">
            <label htmlFor="video">
              {copy.fields.video}
              <span className="glitch-form__optional">{copy.badges.optional}</span>
            </label>
            <p className="glitch-form__hint" id="video-hint">
              {copy.hints.video}
            </p>
            <input
              type="url"
              id="video"
              name="video"
              placeholder={copy.placeholders.video}
              aria-describedby={`video-hint${videoError ? ' video-error' : ''}`}
              aria-invalid={Boolean(videoError)}
              onBlur={handleFieldBlur}
              onChange={handleFieldChange}
            />
            {videoError && (
              <p className="glitch-form__error" id="video-error">
                {videoError}
              </p>
            )}
          </div>

          <div className="glitch-form__field">
            <label htmlFor="description">
              {copy.fields.description}
              <span className="glitch-form__required">{copy.badges.required}</span>
            </label>
            <p className="glitch-form__hint" id="description-hint">
              {copy.hints.description}
            </p>
            <textarea
              id="description"
              name="description"
              rows={6}
              placeholder={copy.placeholders.description}
              aria-describedby={`description-hint${descriptionError ? ' description-error' : ''}`}
              aria-invalid={Boolean(descriptionError)}
              onBlur={handleFieldBlur}
              onChange={handleFieldChange}
              required
            />
            {descriptionError && (
              <p className="glitch-form__error" id="description-error">
                {descriptionError}
              </p>
            )}
          </div>

          <div className="glitch-form__field">
            <label htmlFor="tags">
              {copy.fields.tags}
              <span className="glitch-form__optional">{copy.badges.optional}</span>
            </label>
            <p className="glitch-form__hint" id="tags-hint">
              {copy.hints.tags}
            </p>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder={copy.placeholders.tags}
              aria-describedby={`tags-hint${tagsError ? ' tags-error' : ''}`}
              aria-invalid={Boolean(tagsError)}
              onBlur={handleFieldBlur}
              onChange={handleTagsChange}
              value={tagsValue}
            />
            <div className="glitch-form__tag-suggestions" aria-label={copy.tagSuggestions}>
              <span className="glitch-form__tag-label">{copy.tagSuggestions}</span>
              {tagSuggestions.map((tag) => {
                const isSelected = selectedTags.has(tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`glitch-tag-chip${isSelected ? ' glitch-tag-chip--active' : ''}`}
                    onClick={() => handleTagSuggestionClick(tag)}
                    aria-pressed={isSelected}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {tagsError && (
              <p className="glitch-form__error" id="tags-error">
                {tagsError}
              </p>
            )}
          </div>

          {error && (
            <p className="glitch-form__error" style={{ color: 'var(--c-danger)' }}>
              {error}
            </p>
          )}

          {isConnected && chainId !== base.id && (
            <p style={{ color: 'var(--c-warning)', marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '0.5rem' }}>
              ! {copy.networkWarning}
            </p>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button type="submit" className="glitch-form__submit" disabled={isSubmitting || !isConnected}>
              {isSubmitting
                ? copy.submit.submitting
                : isConnected
                ? copy.submit.cta
                : copy.submit.ctaDisconnected}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
