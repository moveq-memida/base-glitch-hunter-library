'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { keccak256, toBytes, decodeEventLog } from 'viem';
import { base } from 'wagmi/chains';
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
        setError('ウォレットが見つかりません。MetaMaskなどをインストールしてください。');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError('ウォレット接続に失敗しました。もう一度お試しください。');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('まずウォレットを接続してください。');
      return;
    }

    if (!GLITCH_REGISTRY_ADDRESS) {
      setError('コントラクトが未設定です。');
      return;
    }

    // Check if on correct network (Base mainnet)
    if (chainId !== base.id) {
      try {
        await switchChain({ chainId: base.id });
      } catch (error) {
        console.error('Network switch error:', error);
        setError('ウォレットをBase mainnetに切り替えてください。');
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
      setError('送信に失敗しました。もう一度お試しください。');
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
      setError('トランザクションの確定に失敗しました。ウォレットを確認してください。');
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
          setError('オンチェーンへの投稿は完了しましたが、DB保存に失敗しました。');
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
        setError('トランザクションがキャンセルされました。');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('ガス代が不足しています。');
      } else {
        setError(`トランザクションに失敗しました: ${errorMessage.slice(0, 100)}`);
      }
      setIsSubmitting(false);
      resetWrite();
    }
  }, [writeError, resetWrite]);

  return (
    <div className="page">
      <Header actionText="戻る" actionHref="/" />
      <main className="page-main">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>バグを投稿する</h2>
        <p style={{ color: 'var(--c-text-muted)', marginBottom: '2rem' }}>
          発見したバグを登録します。再現手順があると強いです。
        </p>

        <form className="glitch-form" onSubmit={handleSubmit}>
          <div className="glitch-form__field">
            <label htmlFor="title">タイトル</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="例：壁に当たり続けると落下する"
              required
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="game">ゲーム名</label>
            <input
              type="text"
              id="game"
              name="game"
              placeholder="例：ポケモン ダイヤモンド / パール"
              required
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="platform">機種</label>
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
            <label htmlFor="video">動画URL（YouTubeなど）</label>
            <input
              type="url"
              id="video"
              name="video"
              placeholder="https://..."
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="description">説明・再現手順</label>
            <textarea
              id="description"
              name="description"
              rows={6}
              placeholder="1. 〜へ行く\n2. 〜をする\n3. 〜になる"
              required
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="tags">タグ</label>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder="例：pokemon,void,glitch"
            />
          </div>

          {error && (
            <p className="glitch-form__error" style={{ color: 'var(--c-danger)' }}>
              {error}
            </p>
          )}

          {isConnected && chainId !== base.id && (
            <p style={{ color: 'var(--c-warning)', marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '0.5rem' }}>
              ⚠️ ネットワークがBaseではありません。Base mainnetに切り替えてください。
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
                {isConnecting ? '接続中...' : 'ウォレットを接続して投稿'}
              </button>
            ) : (
              <div className="wallet-button" style={{ borderStyle: 'solid', cursor: 'default' }}>
                接続中: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            )}

            <button type="submit" className="glitch-form__submit" disabled={isSubmitting || !isConnected}>
              {isSubmitting ? '送信中...' : '投稿する'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
