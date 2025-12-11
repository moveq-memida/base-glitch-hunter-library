'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { keccak256, toBytes, decodeEventLog } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import Header from '@/components/Header';
import { glitchRegistryABI, GLITCH_REGISTRY_ADDRESS } from '@/lib/contracts';

export default function SubmitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const handleConnect = async () => {
    try {
      // Find the injected connector (MetaMask, etc.)
      const injectedConnector = connectors.find(
        (connector) => connector.id === 'injected'
      );

      if (injectedConnector) {
        await connect({ connector: injectedConnector });
      } else if (connectors.length > 0) {
        // Fallback to first available connector
        await connect({ connector: connectors[0] });
      } else {
        setError('No wallet connector available. Please install MetaMask or another Web3 wallet.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError('Failed to connect wallet. Please try again.');
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

    // Check if on correct network (Base Sepolia)
    if (chainId !== baseSepolia.id) {
      try {
        await switchChain({ chainId: baseSepolia.id });
      } catch (error) {
        console.error('Network switch error:', error);
        setError('Please switch to Base Sepolia network in your wallet');
        return;
      }
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
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle transaction confirmation errors
  React.useEffect(() => {
    if (isConfirmError && confirmError) {
      console.error('Transaction confirmation error:', confirmError);
      setError('Transaction failed to confirm. Please check your wallet.');
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
          router.push(`/glitch/${savedGlitch.id}`);
        } catch (error) {
          console.error('Database save error:', error);
          setError('Glitch submitted on-chain, but failed to save to database');
          setIsSubmitting(false);
        }
      };

      saveToDatabase();
    }
  }, [isConfirmed, hash, address, router, receipt]);

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
        setError('Transaction was cancelled');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient funds for transaction');
      } else {
        setError(`Transaction failed: ${errorMessage.slice(0, 100)}`);
      }
      setIsSubmitting(false);
      resetWrite();
    }
  }, [writeError, resetWrite]);

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

          {isConnected && chainId !== baseSepolia.id && (
            <p style={{ color: 'var(--c-warning)', marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '0.5rem' }}>
              ⚠️ Wrong network detected. Please switch to Base Sepolia to submit glitches.
            </p>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isConnected ? (
              <button
                type="button"
                className="wallet-button"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet to Submit'}
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
