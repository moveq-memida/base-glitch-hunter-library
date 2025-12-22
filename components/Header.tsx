'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

interface HeaderProps {
  actionText?: string;
  actionHref?: string;
}

export default function Header({ actionText, actionHref }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { context } = useMiniKit();
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
  const resolvedActionHref = withLang(actionHref || '/submit');
  const resolvedActionText = actionText || (isEnglish ? 'Submit' : '投稿する');
  const avatarUrl = context?.user?.pfpUrl ?? '';
  const avatarLabel =
    context?.user?.displayName ||
    context?.user?.username ||
    'Profile avatar';
  const showAvatar = isConnected && avatarUrl.length > 0;

  const labels = isEnglish
    ? {
        connecting: 'Connecting...',
        connect: 'Connect wallet',
        disconnectTitle: 'Click to disconnect',
      }
    : {
        connecting: '接続中...',
        connect: 'ウォレット接続',
        disconnectTitle: 'クリックで切断',
      };

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
        <Link href={homeHref}>Glitch Hunter Library</Link>
      </h1>
      <div className="page-header__actions">
        {isConnected ? (
          <button
            className={`wallet-button wallet-button--connected${showAvatar ? ' wallet-button--avatar' : ''}`}
            onClick={() => disconnect()}
            title={labels.disconnectTitle}
          >
            {showAvatar ? (
              <img
                src={avatarUrl}
                alt={avatarLabel}
                className="wallet-button__avatar"
              />
            ) : (
              <>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </>
            )}
          </button>
        ) : (
          <button
            className="wallet-button"
            onClick={handleConnect}
            disabled={isPending}
          >
            {isPending ? labels.connecting : labels.connect}
          </button>
        )}
        <Link href={resolvedActionHref} className="page-header__action">
          {resolvedActionText}
        </Link>
      </div>
    </header>
  );
}
