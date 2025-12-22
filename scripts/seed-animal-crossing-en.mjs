/**
 * Seed English Animal Crossing glitch posts into the production DB, while also creating
 * matching onchain GlitchRegistry entries (so voteCount/hasVoted works). This script ONLY adds posts.
 *
 * Usage (PowerShell):
 *   $env:SEEDER_PRIVATE_KEY="0x..."; node scripts/seed-animal-crossing-en.mjs --execute
 *
 * Optional:
 *   $env:SEED_TARGET_URL="https://base-glitch-hunter-library.vercel.app"
 *   $env:BASE_RPC_URL="https://mainnet.base.org"
 *   node scripts/seed-animal-crossing-en.mjs --dry-run
 *   node scripts/seed-animal-crossing-en.mjs --execute --start-index 11
 *   node scripts/seed-animal-crossing-en.mjs --execute --count 30
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, decodeEventLog, http, keccak256, toBytes } from 'viem';
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

function getArgFlag(name) {
  return process.argv.includes(name);
}

function getArgNumber(name, fallback) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) {
    const value = Number(direct.split('=')[1]);
    return Number.isFinite(value) ? value : fallback;
  }
  const index = process.argv.indexOf(name);
  if (index !== -1) {
    const value = Number(process.argv[index + 1]);
    return Number.isFinite(value) ? value : fallback;
  }
  return fallback;
}

function uniq(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

const execute = getArgFlag('--execute');
const dryRun = getArgFlag('--dry-run') || !execute;

const seedTargetUrl = (env.SEED_TARGET_URL || env.NEXT_PUBLIC_APP_URL || 'https://base-glitch-hunter-library.vercel.app').replace(/\/$/, '');
const registryAddress = env.NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS || env.GLITCH_REGISTRY_ADDRESS;
const rpcUrl = env.BASE_RPC_URL || env.NEXT_PUBLIC_BASE_RPC_URL || base.rpcUrls.default.http[0];

if (!registryAddress) {
  console.error('Missing registry address. Set NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS (in .env) or GLITCH_REGISTRY_ADDRESS.');
  process.exit(1);
}
if (!registryAddress.startsWith('0x')) {
  console.error('Invalid registry address (must start with 0x).');
  process.exit(1);
}

const seederPrivateKey = env.SEEDER_PRIVATE_KEY || env.DEPLOYER_PRIVATE_KEY;
if (execute && (!seederPrivateKey || !seederPrivateKey.startsWith('0x') || seederPrivateKey.length < 66)) {
  console.error('Missing seeder private key. Set SEEDER_PRIVATE_KEY (preferred) or DEPLOYER_PRIVATE_KEY in .env.local / .env.');
  process.exit(1);
}

const youtubeCachePath = path.join(os.tmpdir(), 'glitch-hunter-youtube-cache-ac.json');
const youtubeCache = (() => {
  if (!fs.existsSync(youtubeCachePath)) return {};
  try {
    const parsed = safeJsonParse(fs.readFileSync(youtubeCachePath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
})();

const seeds = [
  {
    title: 'Duplicate items via mailbox timing',
    game_name: 'Animal Crossing (GameCube)',
    platform: 'retro',
    tags: 'duplication, mailbox, animal crossing',
    description: 'Timing-based mailbox interactions can sometimes duplicate items or letters.',
    youtubeQuery: 'Animal Crossing GameCube mailbox duplication glitch',
  },
  {
    title: 'Out of bounds clip near town edges',
    game_name: 'Animal Crossing (Nintendo 64)',
    platform: 'retro',
    tags: 'out of bounds, clip, animal crossing',
    description: 'Certain camera angles or collisions may allow clipping near the edge of town.',
    youtubeQuery: 'Animal Crossing N64 out of bounds glitch',
  },
  {
    title: 'Item dupe with online trade timing',
    game_name: 'Animal Crossing: Wild World',
    platform: 'retro',
    tags: 'duplication, trading, animal crossing',
    description: 'Trade timing quirks can cause items to duplicate under specific conditions.',
    youtubeQuery: 'Animal Crossing Wild World duplication glitch',
  },
  {
    title: 'Bridge placement clip',
    game_name: 'Animal Crossing: City Folk',
    platform: 'retro',
    tags: 'clip, placement, animal crossing',
    description: 'Bridge or incline placement can create unintended clipping paths.',
    youtubeQuery: 'Animal Crossing City Folk clipping glitch',
  },
  {
    title: 'Menu storage to duplicate items',
    game_name: 'Animal Crossing: New Leaf',
    platform: 'retro',
    tags: 'duplication, menu, animal crossing',
    description: 'Menu storage tricks may allow item duplication or state desync.',
    youtubeQuery: 'Animal Crossing New Leaf duplication glitch',
  },
  {
    title: 'Out of bounds island clip',
    game_name: 'Animal Crossing: New Leaf',
    platform: 'retro',
    tags: 'out of bounds, island, animal crossing',
    description: 'Collision glitches can allow clipping out of bounds on the island.',
    youtubeQuery: 'Animal Crossing New Leaf out of bounds glitch',
  },
  {
    title: 'Turnip dupe timing',
    game_name: 'Animal Crossing: New Horizons',
    platform: 'switch',
    tags: 'duplication, turnips, animal crossing',
    description: 'Early versions allowed turnip duplication via timing and inventory desync.',
    youtubeQuery: 'Animal Crossing New Horizons turnip duplication glitch',
  },
  {
    title: 'Swimming out of bounds',
    game_name: 'Animal Crossing: New Horizons',
    platform: 'switch',
    tags: 'out of bounds, swimming, animal crossing',
    description: 'Swimming can sometimes push the player into out-of-bounds areas.',
    youtubeQuery: 'Animal Crossing New Horizons out of bounds swim glitch',
  },
  {
    title: 'Terrain clipping with ladder',
    game_name: 'Animal Crossing: New Horizons',
    platform: 'switch',
    tags: 'clip, ladder, animal crossing',
    description: 'Ladder placement or corner angles can clip through terrain.',
    youtubeQuery: 'Animal Crossing New Horizons ladder clip glitch',
  },
  {
    title: 'Design placement overlap',
    game_name: 'Animal Crossing: Happy Home Designer',
    platform: 'retro',
    tags: 'placement, overlap, animal crossing',
    description: 'Decor placement can overlap or desync in edge cases.',
    youtubeQuery: 'Happy Home Designer placement glitch',
  },
  {
    title: 'Inventory desync in camps',
    game_name: 'Animal Crossing: Pocket Camp',
    platform: 'mobile',
    tags: 'inventory, desync, animal crossing',
    description: 'Mobile sync issues can cause temporary item state mismatches.',
    youtubeQuery: 'Animal Crossing Pocket Camp inventory glitch',
  },
  {
    title: 'Amiibo Festival board softlock',
    game_name: 'Animal Crossing: amiibo Festival',
    platform: 'retro',
    tags: 'softlock, board, animal crossing',
    description: 'Rare board state interactions can lead to a softlock.',
    youtubeQuery: 'Animal Crossing amiibo Festival softlock glitch',
  },
];

function expandToCount(baseSeeds, targetCount) {
  if (baseSeeds.length >= targetCount) return baseSeeds.slice(0, targetCount);

  const templates = [
    {
      suffix: ' (alternate setup)',
      extraTag: 'setup',
      descAddon: 'Alternate setup with slightly different timing.',
    },
    {
      suffix: ' (stable timing)',
      extraTag: 'timing',
      descAddon: 'Focuses on consistent inputs for easier reproduction.',
    },
    {
      suffix: ' (modern patch)',
      extraTag: 'patch',
      descAddon: 'Similar behavior reported on newer patches or versions.',
    },
  ];

  const out = [...baseSeeds];
  let templateIndex = 0;
  let cursor = 0;

  while (out.length < targetCount) {
    const baseSeed = baseSeeds[cursor % baseSeeds.length];
    const t = templates[templateIndex % templates.length];
    templateIndex += 1;
    cursor += 1;

    out.push({
      ...baseSeed,
      title: `${baseSeed.title}${t.suffix}`,
      tags: uniq(`${baseSeed.tags}, ${t.extraTag}`.split(',').map((s) => s.trim())).join(', '),
      description: `${baseSeed.description}\n\nNote: ${t.descAddon}`,
      youtubeQuery: `${baseSeed.youtubeQuery} ${t.extraTag}`,
    });
  }

  return out.slice(0, targetCount);
}

async function searchYouTubeUrl(query, usedVideoIds) {
  const cachedIds = Array.isArray(youtubeCache[query]) ? youtubeCache[query] : [];
  const cachedPick = cachedIds.find((id) => typeof id === 'string' && id.length === 11 && !usedVideoIds.has(id));
  if (cachedPick) {
    usedVideoIds.add(cachedPick);
    return `https://www.youtube.com/watch?v=${cachedPick}`;
  }

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          accept: 'text/html',
          'accept-language': 'en-US,en;q=0.9',
          referer: 'https://www.youtube.com/',
        },
      });

      if (!res.ok) {
        throw new Error(`YouTube search failed (${res.status})`);
      }

      const html = await res.text();
      const matches = [...html.matchAll(/watch\?v=([A-Za-z0-9_-]{11})/g)].map((m) => m[1]);
      const uniqueIds = uniq(matches);
      const pick = uniqueIds.find((id) => !usedVideoIds.has(id));

      if (!pick) {
        throw new Error('No usable YouTube video IDs found (all duplicates?)');
      }

      youtubeCache[query] = uniqueIds.slice(0, 30);
      usedVideoIds.add(pick);
      return `https://www.youtube.com/watch?v=${pick}`;
    } catch (error) {
      if (attempt === maxAttempts) {
        if (cachedIds.length > 0) {
          const fallback = cachedIds.find((id) => typeof id === 'string' && id.length === 11) || null;
          if (fallback) {
            usedVideoIds.add(fallback);
            return `https://www.youtube.com/watch?v=${fallback}`;
          }
        }
        throw error;
      }

      const backoffMs = 1500 * attempt + Math.floor(Math.random() * 600);
      await sleep(backoffMs);
    }
  }

  throw new Error('Unreachable: searchYouTubeUrl');
}

async function createOnchainAndDbPost({ walletClient, publicClient, account, seed, usedVideoIds }) {
  const videoUrl = await searchYouTubeUrl(seed.youtubeQuery, usedVideoIds);

  const metadata = {
    title: seed.title,
    game_name: seed.game_name,
    platform: seed.platform,
    video_url: videoUrl,
    description: seed.description,
    tags: seed.tags,
  };

  const contentHash = keccak256(toBytes(JSON.stringify(metadata)));

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
      // ignore non-matching logs
    }
  }

  if (onchainGlitchId === null || Number.isNaN(onchainGlitchId)) {
    throw new Error('Failed to decode onchain glitchId from receipt logs');
  }

  const dbRes = await fetch(`${seedTargetUrl}/api/glitches`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...metadata,
      author_address: account.address,
      onchain_glitch_id: onchainGlitchId,
      content_hash: contentHash,
    }),
  });

  if (!dbRes.ok) {
    const text = await dbRes.text().catch(() => '');
    throw new Error(`DB insert failed (${dbRes.status}): ${text.slice(0, 400)}`);
  }

  const created = await dbRes.json();
  return {
    dbId: created?.id,
    onchainGlitchId,
    contentHash,
    txHash,
    videoUrl,
    title: seed.title,
  };
}

async function main() {
  const targetCount = getArgNumber('--count', 30);
  const startIndex = Math.max(1, getArgNumber('--start-index', 1));
  const expandedSeeds = expandToCount(seeds, targetCount);
  const usedVideoIds = new Set();

  console.log(`Seed target: ${seedTargetUrl}`);
  console.log(`Registry: ${registryAddress}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'execute'}`);
  console.log(`Posts: ${expandedSeeds.length}`);
  console.log(`Start index: ${startIndex}`);

  if (dryRun) {
    const urls = [];
    for (let i = startIndex - 1; i < expandedSeeds.length; i += 1) {
      const seed = expandedSeeds[i];
      try {
        const videoUrl = await searchYouTubeUrl(seed.youtubeQuery, usedVideoIds);
        urls.push({ index: i + 1, title: seed.title, game: seed.game_name, videoUrl });
        if ((i + 1) % 10 === 0) console.log(`Collected ${i + 1}/${expandedSeeds.length} video URLs...`);
        await sleep(1200);
      } catch (error) {
        console.error(`Failed at ${i + 1}/${expandedSeeds.length}: ${seed.youtubeQuery}`);
        throw error;
      }
    }

    console.log(`OK: collected ${urls.length} video URLs.`);
    try {
      fs.writeFileSync(youtubeCachePath, JSON.stringify(youtubeCache, null, 2), 'utf8');
      console.log(`Wrote YouTube cache: ${youtubeCachePath}`);
    } catch {
      // ignore
    }
    return;
  }

  const account = privateKeyToAccount(seederPrivateKey);
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: base, transport: http(rpcUrl), account });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Seeder: ${account.address} (balance: ${balance} wei)`);

  const results = [];
  for (let i = startIndex - 1; i < expandedSeeds.length; i += 1) {
    const seed = expandedSeeds[i];
    console.log(`\n[${i + 1}/${expandedSeeds.length}] ${seed.game_name} / ${seed.title}`);
    const result = await createOnchainAndDbPost({ walletClient, publicClient, account, seed, usedVideoIds });
    results.push(result);
    console.log(`- onchain glitchId: ${result.onchainGlitchId}`);
    console.log(`- tx: https://basescan.org/tx/${result.txHash}`);
    console.log(`- dbId: ${result.dbId}`);
    try {
      fs.writeFileSync(youtubeCachePath, JSON.stringify(youtubeCache, null, 2), 'utf8');
    } catch {
      // ignore
    }
    await sleep(1200);
  }

  const outPath = path.join(__dirname, `seed-prod-results.${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ createdAt: new Date().toISOString(), seedTargetUrl, registryAddress, results }, null, 2), 'utf8');
  console.log(`\nDone. Wrote results to: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
