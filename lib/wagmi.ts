import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount } from 'wagmi/connectors';

const defaultRpcUrl = base.rpcUrls.default.http[0];

function resolvePublicRpcUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return defaultRpcUrl;
  const lower = trimmed.toLowerCase();
  if (lower.includes('alchemy.com') || lower.includes('alchemyapi.io')) {
    return defaultRpcUrl;
  }
  return trimmed;
}

const baseRpcUrl = resolvePublicRpcUrl(process.env.NEXT_PUBLIC_BASE_RPC_URL);

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
