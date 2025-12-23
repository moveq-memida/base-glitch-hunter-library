'use client';

import { MiniKitProvider as CoinbaseMiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base } from 'viem/chains';
import type { ReactNode } from 'react';

interface MiniKitProviderProps {
  children: ReactNode;
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  return (
    <CoinbaseMiniKitProvider
      chain={base}
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
