'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

interface HeaderProps {
  actionText?: string;
  actionHref?: string;
}

export default function Header({ actionText = 'Submit', actionHref = '/submit' }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { context } = useMiniKit();

  const displayAddress = address;
  const avatarUrl = context?.user?.pfpUrl ?? '';
  const avatarLabel = context?.user?.displayName || context?.user?.username || 'Profile avatar';
  const showAvatar = isConnected && avatarUrl.length > 0;
  const isMiniApp = Boolean(context);
  const shouldDisableWalletAction = isMiniApp && isConnected;
  const hasInjectedProvider = typeof window !== 'undefined' && Boolean((window as Window & { ethereum?: unknown }).ethereum);

  const handleConnect = () => {
    const baseAccountConnector = connectors.find((c) => c.id === 'baseAccount');
    const injectedConnector = connectors.find((c) => c.id === 'injected');

    if (isMiniApp && baseAccountConnector) {
      connect({ connector: baseAccountConnector });
      return;
    }
    if (hasInjectedProvider && injectedConnector) {
      connect({ connector: injectedConnector });
      return;
    }
    if (baseAccountConnector) {
      connect({ connector: baseAccountConnector });
      return;
    }
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <header className="page-header">
      <h1 className="page-header__title">
        <Link href="/">GLITCH_HUNTER_LIB</Link>
      </h1>
      <div className="page-header__actions">
        {isConnected ? (
          <button
            className={`wallet-button wallet-button--connected${showAvatar ? ' wallet-button--avatar' : ''}`}
            onClick={shouldDisableWalletAction ? undefined : handleDisconnect}
            title={shouldDisableWalletAction ? undefined : 'Click to disconnect'}
            disabled={shouldDisableWalletAction}
            aria-disabled={shouldDisableWalletAction}
          >
            {showAvatar ? (
              <img
                src={avatarUrl}
                alt={avatarLabel}
                className="wallet-button__avatar"
              />
            ) : displayAddress ? (
              <>
                {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
              </>
            ) : (
              <>Connecting...</>
            )}
          </button>
        ) : (
          <button
            className="wallet-button"
            onClick={handleConnect}
            disabled={isPending}
          >
            {isPending ? 'Connecting...' : '[CONNECT]'}
          </button>
        )}
        <Link href={actionHref} className="page-header__action">
          {actionText}
        </Link>
      </div>
    </header>
  );
}
