import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected({
      shimDisconnect: true,
      target() {
        return {
          id: 'injected',
          name: 'Injected Wallet',
          provider: typeof window !== 'undefined' ? window.ethereum : undefined,
        };
      },
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true, // Enable SSR support
});
