'use client';

import { MiniKitProvider as CoinbaseMiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base, baseSepolia } from 'viem/chains';
import type { ReactNode } from 'react';

interface MiniKitProviderProps {
  children: ReactNode;
}

const getChain = () => {
  const env = process.env.NEXT_PUBLIC_CHAIN;
  if (env === 'mainnet') return base;
  return baseSepolia;
};

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  const chain = getChain();

  return (
    <CoinbaseMiniKitProvider
      chain={chain}
      config={{
        appearance: {
          name: 'Glitch Hunter Library',
          logo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/icon.png`,
        },
      }}
    >
      {children}
    </CoinbaseMiniKitProvider>
  );
}
