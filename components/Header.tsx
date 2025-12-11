'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

interface HeaderProps {
  actionText?: string;
  actionHref?: string;
}

export default function Header({ actionText = 'Submit Glitch', actionHref = '/submit' }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  return (
    <header className="page-header">
      <h1 className="page-header__title">
        <Link href="/">Glitch Hunter Library</Link>
      </h1>
      <div className="page-header__actions">
        {isConnected ? (
          <button
            className="wallet-button wallet-button--connected"
            onClick={() => disconnect()}
            title="Click to disconnect"
          >
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </button>
        ) : (
          <button
            className="wallet-button"
            onClick={handleConnect}
            disabled={isPending}
          >
            {isPending ? 'Connecting...' : 'Connect'}
          </button>
        )}
        <Link href={actionHref} className="page-header__action">
          {actionText}
        </Link>
      </div>
    </header>
  );
}
