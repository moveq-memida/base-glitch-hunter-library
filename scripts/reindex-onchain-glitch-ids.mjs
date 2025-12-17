/**
 * Re-submit existing DB posts to a NEW GlitchRegistry contract and overwrite
 * each row's `onchain_glitch_id` to match the new contract.
 *
 * This is required when we redeploy GlitchRegistry (e.g., to change voting rules).
 *
 * Usage (PowerShell):
 *   $env:NEW_REGISTRY_ADDRESS="0x..."; node scripts/reindex-onchain-glitch-ids.mjs
 *
 * Requirements:
 * - DATABASE_URL in .env/.env.local
 * - DEPLOYER_PRIVATE_KEY in .env/.env.local (will be used as tx sender)
 * - BASE_MAINNET_RPC_URL in .env/.env.local (optional; defaults to https://mainnet.base.org)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { createPublicClient, createWalletClient, decodeEventLog, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseDotenv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadEnvFromRepoRoot() {
  const root = path.resolve(__dirname, '..');
  const candidates = ['.env.local', '.env'];
  const loaded = {};

  for (const file of candidates) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const text = fs.readFileSync(fullPath, 'utf8');
      Object.assign(loaded, parseDotenv(text));
    } catch {
      // ignore
    }
  }

  return loaded;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const glitchRegistryABI = [
  {
    type: 'function',
    name: 'submitGlitch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'contentHash', type: 'bytes32' }],
    outputs: [{ name: 'glitchId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextGlitchId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'GlitchSubmitted',
    inputs: [
      { name: 'glitchId', type: 'uint256', indexed: true },
      { name: 'author', type: 'address', indexed: true },
      { name: 'contentHash', type: 'bytes32', indexed: false },
    ],
  },
];

const envFromFiles = loadEnvFromRepoRoot();
const env = { ...envFromFiles, ...process.env };

const registryAddress = (env.NEW_REGISTRY_ADDRESS || env.NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS || '').trim();
if (!registryAddress || !registryAddress.startsWith('0x') || registryAddress.length !== 42) {
  console.error('Set NEW_REGISTRY_ADDRESS to the new GlitchRegistry address (0x + 40 hex).');
  process.exit(1);
}

const privateKey = (env.DEPLOYER_PRIVATE_KEY || '').trim();
if (!privateKey || !privateKey.startsWith('0x') || privateKey.length < 66) {
  console.error('Missing DEPLOYER_PRIVATE_KEY (used to submitGlitch onchain).');
  process.exit(1);
}

const rpcUrl = (env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org').trim();

async function main() {
  const prisma = new PrismaClient();

  const glitches = await prisma.glitch.findMany({
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      title: true,
      onchain_glitch_id: true,
      content_hash: true,
    },
  });

  console.log(`DB glitches: ${glitches.length}`);
  if (glitches.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: base, transport: http(rpcUrl), account });

  const nextId = await publicClient.readContract({
    address: registryAddress,
    abi: glitchRegistryABI,
    functionName: 'nextGlitchId',
  });

  console.log(`New registry: ${registryAddress} (nextGlitchId=${nextId})`);
  if (BigInt(nextId) !== BigInt(0)) {
    console.log('Note: nextGlitchId is not 0; IDs will start from this value.');
  }

  for (let i = 0; i < glitches.length; i += 1) {
    const glitch = glitches[i];
    const contentHash = (glitch.content_hash || '').trim();
    if (!contentHash.startsWith('0x') || contentHash.length !== 66) {
      throw new Error(`Invalid content_hash for dbId=${glitch.id}`);
    }

    console.log(`\n[${i + 1}/${glitches.length}] dbId=${glitch.id} -> submitGlitch(contentHash)`);

    const txHash = await walletClient.writeContract({
      address: registryAddress,
      abi: glitchRegistryABI,
      functionName: 'submitGlitch',
      args: [contentHash],
      account,
      chain: base,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    let onchainGlitchId = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: glitchRegistryABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'GlitchSubmitted') {
          onchainGlitchId = Number(decoded.args.glitchId);
          break;
        }
      } catch {
        // ignore
      }
    }

    if (onchainGlitchId === null || Number.isNaN(onchainGlitchId)) {
      throw new Error(`Failed to decode glitchId from tx ${txHash}`);
    }

    await prisma.glitch.update({
      where: { id: glitch.id },
      data: { onchain_glitch_id: onchainGlitchId },
    });

    console.log(`- onchainGlitchId=${onchainGlitchId} tx=https://basescan.org/tx/${txHash}`);
    await sleep(900);
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

