import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount } from 'wagmi/connectors';

const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || base.rpcUrls.default.http[0];

export const config = createConfig({
  chains: [base],
  connectors: [
    baseAccount(),
  ],
  transports: {
    [base.id]: http(baseRpcUrl),
  },
  ssr: true,
});
