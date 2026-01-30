'use client';

import { useAccount } from 'wagmi';
import { useCallback, useMemo, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  walletAddress?: string;
  email?: string;
  discordId?: string;
  displayName?: string;
  avatarUrl?: string;
}

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

export function useAuth() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  // Privy state - dynamically loaded
  const [privyState, setPrivyState] = useState<{
    ready: boolean;
    authenticated: boolean;
    user: AuthUser | null;
    login?: () => void;
    logout?: () => Promise<void>;
    linkWallet?: () => void;
    linkEmail?: () => void;
    linkDiscord?: () => void;
    wallets: Array<{ address: string }>;
  }>({
    ready: false,
    authenticated: false,
    user: null,
    wallets: [],
  });

  // Note: Privy hooks must be used within PrivyProvider context
  // This hook provides a fallback when Privy is not available
  useEffect(() => {
    if (!PRIVY_APP_ID) {
      setPrivyState((prev) => ({ ...prev, ready: true }));
    }
  }, []);

  const user = useMemo<AuthUser | null>(() => {
    if (privyState.user) return privyState.user;
    if (wagmiConnected && wagmiAddress) {
      return {
        id: wagmiAddress,
        walletAddress: wagmiAddress,
      };
    }
    return null;
  }, [privyState.user, wagmiConnected, wagmiAddress]);

  const isReady = privyState.ready || !PRIVY_APP_ID;
  const isAuthenticated = privyState.authenticated || wagmiConnected;
  const hasWallet = useMemo(() => {
    if (wagmiConnected && wagmiAddress) return true;
    return privyState.wallets.length > 0;
  }, [wagmiConnected, wagmiAddress, privyState.wallets]);

  const getActiveWalletAddress = useCallback((): string | undefined => {
    if (wagmiConnected && wagmiAddress) return wagmiAddress;
    if (privyState.wallets.length > 0) return privyState.wallets[0].address;
    return user?.walletAddress;
  }, [wagmiConnected, wagmiAddress, privyState.wallets, user]);

  const handleLogin = useCallback(() => {
    if (privyState.login) {
      privyState.login();
    }
  }, [privyState]);

  const handleLogout = useCallback(async () => {
    if (privyState.logout) {
      await privyState.logout();
    }
  }, [privyState]);

  const handleLinkWallet = useCallback(() => {
    if (privyState.linkWallet) {
      privyState.linkWallet();
    }
  }, [privyState]);

  const handleLinkEmail = useCallback(() => {
    if (privyState.linkEmail) {
      privyState.linkEmail();
    }
  }, [privyState]);

  const handleLinkDiscord = useCallback(() => {
    if (privyState.linkDiscord) {
      privyState.linkDiscord();
    }
  }, [privyState]);

  return {
    isReady,
    isAuthenticated,
    hasWallet,
    user,
    privyUser: privyState.user,
    wallets: privyState.wallets,
    login: handleLogin,
    logout: handleLogout,
    linkWallet: handleLinkWallet,
    linkEmail: handleLinkEmail,
    linkDiscord: handleLinkDiscord,
    getActiveWalletAddress,
  };
}
