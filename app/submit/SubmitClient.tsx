'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { keccak256, toBytes, decodeEventLog } from 'viem';
import { base } from 'wagmi/chains';
import Header from '@/components/Header';
import DifficultyRating from '@/components/DifficultyRating';
import ReproductionStepsEditor, { type ReproductionStep } from '@/components/ReproductionStepsEditor';
import { getAllCategories, type SpeedrunCategory } from '@/components/SpeedrunCategoryBadge';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

export default function SubmitClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tagsValue, setTagsValue] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [reproductionSteps, setReproductionSteps] = useState<ReproductionStep[]>([]);
  const [speedrunCategory, setSpeedrunCategory] = useState<SpeedrunCategory>('ANY_PERCENT');

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

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
      return 'This field is required.';
    }
    if (name === 'video' && trimmed) {
      try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return 'Enter a valid URL (https://...)';
        }
      } catch {
        return 'Enter a valid URL (https://...)';
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
      speedrun_category: String(formData.get('speedrunCategory') || 'ANY_PERCENT'),
      difficulty: parseInt(String(formData.get('difficulty') || '3'), 10),
      estimated_time_save: String(formData.get('estimatedTimeSave') || ''),
      game_version: String(formData.get('gameVersion') || ''),
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
      setError('Connect your wallet first.');
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError('Contract address is missing.');
      return;
    }

    if (chainId !== base.id) {
      try {
        await switchChain({ chainId: base.id });
      } catch (error) {
        console.error('Network switch error:', error);
        setError('Please switch your wallet to Base mainnet.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const metadataString = JSON.stringify(metadata);
      const contentHash = keccak256(toBytes(metadataString));

      writeContract({
        address: GLITCH_REGISTRY_ADDRESS,
        abi: glitchRegistryABI,
        functionName: 'submitGlitch',
        args: [contentHash],
      });
    } catch (error) {
      console.error('Submit error:', error);
      setError('Submit failed. Try again.');
      setIsSubmitting(false);
    }
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  React.useEffect(() => {
    if (isConfirmError && confirmError) {
      console.error('Transaction confirmation error:', confirmError);
      setError('Transaction confirmation failed. Check your wallet.');
      setIsSubmitting(false);
    }
  }, [isConfirmError, confirmError]);

  React.useEffect(() => {
    if (isConfirmed && hash && receipt) {
      const saveToDatabase = async () => {
        try {
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
              reproduction_steps: reproductionSteps.filter(s => s.instruction.trim()),
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save to database');
          }

          const savedGlitch = await response.json();
          router.push(`/glitch/${savedGlitch.id}`);
        } catch (error) {
          console.error('Database save error:', error);
          setError('Onchain submit succeeded, but saving failed.');
          setIsSubmitting(false);
        }
      };

      saveToDatabase();
    }
  }, [isConfirmed, hash, address, router, receipt, reproductionSteps]);

  React.useEffect(() => {
    if (isPending || isConfirming) {
      setIsSubmitting(true);
    }
  }, [isPending, isConfirming]);

  React.useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);
      const errorMessage = writeError.message || 'Transaction failed';
      if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
        setError('Transaction canceled.');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Not enough gas.');
      } else {
        setError(`Transaction failed: ${errorMessage.slice(0, 100)}`);
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
      <Header actionText="Back" actionHref="/" />
      <main className="page-main">
        <h2 className="page-title">Submit a Glitch</h2>
        <p className="page-subtitle">
          Share a glitch you found. Short repro steps help the most.
        </p>
        <form className="glitch-form" onSubmit={handleSubmit}>
          <div className="glitch-form__field">
            <label htmlFor="title">
              Title
              <span className="glitch-form__required"> *Required</span>
            </label>
            <p className="glitch-form__hint" id="title-hint">
              Keep it short. Include the trigger.
            </p>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g. Rolling into a wall makes you fall through"
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
              Game Name
              <span className="glitch-form__required"> *Required</span>
            </label>
            <p className="glitch-form__hint" id="game-hint">
              Use the official game name when possible.
            </p>
            <input
              type="text"
              id="game"
              name="game"
              placeholder="e.g. Pokemon Diamond / Pearl"
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
            <label htmlFor="platform">Platform</label>
            <p className="glitch-form__hint" id="platform-hint">
              Pick the platform where it happens.
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
              Video URL (YouTube etc.)
              <span className="glitch-form__optional"> Optional</span>
            </label>
            <p className="glitch-form__hint" id="video-hint">
              Optional. Paste a link.
            </p>
            <input
              type="url"
              id="video"
              name="video"
              placeholder="https://..."
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
              Description & Reproduction Steps
              <span className="glitch-form__required"> *Required</span>
            </label>
            <p className="glitch-form__hint" id="description-hint">
              Short, numbered steps help.
            </p>
            <textarea
              id="description"
              name="description"
              rows={6}
              placeholder="1. Go to...\n2. Do...\n3. It happens..."
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
              Tags
              <span className="glitch-form__optional"> Optional</span>
            </label>
            <p className="glitch-form__hint" id="tags-hint">
              Comma-separated. Optional (English tags recommended).
            </p>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder="e.g. pokemon,void,glitch"
              aria-describedby={`tags-hint${tagsError ? ' tags-error' : ''}`}
              aria-invalid={Boolean(tagsError)}
              onBlur={handleFieldBlur}
              onChange={handleTagsChange}
              value={tagsValue}
            />
            <div className="glitch-form__tag-suggestions" aria-label="Popular tags">
              <span className="glitch-form__tag-label">Popular tags</span>
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

          <div className="glitch-form__field">
            <label htmlFor="speedrunCategory">
              Speedrun Category
              <span className="glitch-form__optional"> Optional</span>
            </label>
            <p className="glitch-form__hint" id="speedrun-hint">
              Which speedrun category is this most useful for?
            </p>
            <select
              id="speedrunCategory"
              name="speedrunCategory"
              value={speedrunCategory}
              onChange={(e) => setSpeedrunCategory(e.target.value as SpeedrunCategory)}
              aria-describedby="speedrun-hint"
            >
              {getAllCategories().map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="glitch-form__field">
            <label>
              Difficulty
              <span className="glitch-form__optional"> Optional</span>
            </label>
            <p className="glitch-form__hint">
              How hard is it to reproduce?
            </p>
            <DifficultyRating
              difficulty={difficulty}
              editable
              onChange={setDifficulty}
              showLabel
            />
            <input type="hidden" name="difficulty" value={difficulty} />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="estimatedTimeSave">
              Estimated Time Save
              <span className="glitch-form__optional"> Optional</span>
            </label>
            <p className="glitch-form__hint" id="timesave-hint">
              e.g. &quot;5 seconds&quot;, &quot;2 minutes&quot;
            </p>
            <input
              type="text"
              id="estimatedTimeSave"
              name="estimatedTimeSave"
              aria-describedby="timesave-hint"
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="gameVersion">
              Game Version
              <span className="glitch-form__optional"> Optional</span>
            </label>
            <p className="glitch-form__hint" id="version-hint">
              e.g. &quot;1.0&quot;, &quot;NTSC&quot;, &quot;Steam&quot;
            </p>
            <input
              type="text"
              id="gameVersion"
              name="gameVersion"
              aria-describedby="version-hint"
            />
          </div>

          <div className="glitch-form__field">
            <label>
              Reproduction Steps
              <span className="glitch-form__optional"> Optional</span>
            </label>
            <p className="glitch-form__hint">
              Step-by-step instructions to reproduce.
            </p>
            <ReproductionStepsEditor
              steps={reproductionSteps}
              onChange={setReproductionSteps}
            />
          </div>

          {error && (
            <p className="glitch-form__error" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}

          {isConnected && chainId !== base.id && (
            <p style={{ color: 'var(--accent-gold)', marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(244, 208, 63, 0.1)', border: '2px solid var(--accent-gold)' }}>
              ! Network is not Base. Switch to Base mainnet.
            </p>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button type="submit" className="glitch-form__submit" disabled={isSubmitting || !isConnected}>
              {isSubmitting
                ? 'Submitting...'
                : isConnected
                ? 'Submit'
                : 'Connect wallet in header'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
