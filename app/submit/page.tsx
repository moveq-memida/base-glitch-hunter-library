'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import Header from '@/components/Header';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

export default function SubmitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, data: hash, isPending } = useWriteContract();

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError('Contract address not configured. Please deploy the contract first.');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const metadata = {
      title: formData.get('title') as string,
      game_name: formData.get('game') as string,
      platform: formData.get('platform') as string,
      video_url: formData.get('video') as string,
      description: formData.get('description') as string,
      tags: formData.get('tags') as string,
    };

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
      setError('Failed to submit glitch. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Wait for transaction and save to database
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle transaction success
  React.useEffect(() => {
    if (isConfirmed && hash) {
      const saveToDatabase = async () => {
        try {
          // Get the glitch ID from the transaction receipt
          // For simplicity, we'll assume the next glitch ID
          // In production, you should parse the event from the receipt
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
              onchain_glitch_id: 0, // TODO: Get from event log
              content_hash: contentHash,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save to database');
          }

          const savedGlitch = await response.json();
          router.push(`/glitch/${savedGlitch.id}`);
        } catch (error) {
          console.error('Database save error:', error);
          setError('Glitch submitted on-chain, but failed to save to database');
          setIsSubmitting(false);
        }
      };

      saveToDatabase();
    }
  }, [isConfirmed, hash, address, router]);

  React.useEffect(() => {
    if (isPending || isConfirming) {
      setIsSubmitting(true);
    }
  }, [isPending, isConfirming]);

  return (
    <div className="page">
      <Header actionText="Cancel" actionHref="/" />
      <main className="page-main">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Submit a new glitch</h2>
        <p style={{ color: 'var(--c-text-muted)', marginBottom: '2rem' }}>
          Add a discovered glitch to the library. Please include detailed reproduction steps.
        </p>

        <form className="glitch-form" onSubmit={handleSubmit}>
          <div className="glitch-form__field">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g. Rolling into the wall causes falling"
              required
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="game">Game Name</label>
            <input
              type="text"
              id="game"
              name="game"
              placeholder="e.g. Elden Ring"
              required
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="platform">Platform</label>
            <select id="platform" name="platform">
              <option value="pc">PC / Steam</option>
              <option value="ps5">PlayStation 5</option>
              <option value="switch">Nintendo Switch</option>
              <option value="xbox">Xbox Series X/S</option>
              <option value="mobile">Mobile (iOS/Android)</option>
              <option value="retro">Retro Console</option>
            </select>
          </div>

          <div className="glitch-form__field">
            <label htmlFor="video">Video URL (YouTube/Twitch)</label>
            <input
              type="url"
              id="video"
              name="video"
              placeholder="https://..."
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="description">Description & Reproduction Steps</label>
            <textarea
              id="description"
              name="description"
              rows={6}
              placeholder="1. Go to the specific cliff&#10;2. Use the item...&#10;3. ..."
              required
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="tags">Tags</label>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder="physics, out-of-bounds, softlock"
            />
          </div>

          {error && (
            <p className="glitch-form__error" style={{ color: 'var(--c-danger)' }}>
              {error}
            </p>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isConnected ? (
              <button type="button" className="wallet-button" onClick={handleConnect}>
                Connect Wallet to Submit
              </button>
            ) : (
              <div className="wallet-button" style={{ borderStyle: 'solid', cursor: 'default' }}>
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            )}

            <button type="submit" className="glitch-form__submit" disabled={isSubmitting || !isConnected}>
              {isSubmitting ? 'Submitting...' : 'Submit Glitch'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
