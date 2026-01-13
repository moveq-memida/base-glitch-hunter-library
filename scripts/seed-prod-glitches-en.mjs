/**
 * Seed English-language glitch posts into the production DB, while also creating matching
 * onchain GlitchRegistry entries (so voteCount/hasVoted works). This script ONLY adds posts.
 *
 * Usage (PowerShell):
 *   $env:SEEDER_PRIVATE_KEY="0x..."; node scripts/seed-prod-glitches-en.mjs --execute
 *
 * Optional:
 *   $env:SEED_TARGET_URL="https://memida.xyz"
 *   $env:BASE_RPC_URL="https://mainnet.base.org"
 *   node scripts/seed-prod-glitches-en.mjs --dry-run
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

const seedTargetUrl = (env.SEED_TARGET_URL || env.NEXT_PUBLIC_APP_URL || 'https://memida.xyz').replace(/\/$/, '');
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

const youtubeCachePath = path.join(os.tmpdir(), 'glitch-hunter-youtube-cache-en.json');
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
    title: 'Backwards long jump through the staircase',
    game_name: 'Super Mario 64',
    platform: 'retro',
    tags: 'blj, staircase skip, mario, speedrun',
    description: 'Build backward speed on stairs to bypass doors that require stars. Famous speedrun tech.',
    youtubeQuery: 'Super Mario 64 BLJ staircase glitch',
  },
  {
    title: 'Giant Space Program launch',
    game_name: 'The Elder Scrolls V: Skyrim',
    platform: 'pc',
    tags: 'physics, launch, skyrim, funny',
    description: 'Giant attacks can launch the player into the sky due to physics impulse stacking.',
    youtubeQuery: 'Skyrim giant space program glitch',
  },
  {
    title: 'Swing Set Glitch launch',
    game_name: 'Grand Theft Auto IV',
    platform: 'retro',
    tags: 'physics, launch, gta, vehicle',
    description: 'Drive into a swing set at the right angle to get catapulted across the city.',
    youtubeQuery: 'GTA IV swing set glitch',
  },
  {
    title: 'MissingNo. item duplication',
    game_name: 'Pokemon Red/Blue',
    platform: 'retro',
    tags: 'missingno, item duplication, pokemon',
    description: 'Encounter MissingNo. to overflow item counts. Classic glitch with save risk.',
    youtubeQuery: 'Pokemon Red Blue MissingNo item duplication',
  },
  {
    title: 'Moon jump',
    game_name: 'The Legend of Zelda: Breath of the Wild',
    platform: 'switch',
    tags: 'moon jump, movement, botw',
    description: 'Abnormal status effects allow super-high jumps and midair traversal.',
    youtubeQuery: 'BOTW moon jump glitch',
  },
  {
    title: 'Item duplication early in the game',
    game_name: 'The Legend of Zelda: Tears of the Kingdom',
    platform: 'switch',
    tags: 'duplication, items, totk',
    description: 'Timing-based inventory desync creates duplicate items. Patch versions vary.',
    youtubeQuery: 'TOTK item duplication glitch',
  },
  {
    title: 'Far Lands terrain collapse',
    game_name: 'Minecraft',
    platform: 'pc',
    tags: 'far lands, world generation, minecraft',
    description: 'Extremely distant coordinates break terrain generation into chaotic patterns.',
    youtubeQuery: 'Minecraft Far Lands glitch',
  },
  {
    title: 'Super bounce out of bounds',
    game_name: 'Halo 2',
    platform: 'xbox',
    tags: 'super bounce, out of bounds, halo',
    description: 'Physics boosts launch the player to unintended areas for skips and exploration.',
    youtubeQuery: 'Halo 2 super bounce glitch',
  },
  {
    title: 'Wrong warp',
    game_name: 'The Legend of Zelda: Ocarina of Time',
    platform: 'retro',
    tags: 'wrong warp, sequence break, zelda',
    description: 'Manipulate loading zones to warp to unintended locations and skip large sections.',
    youtubeQuery: 'Ocarina of Time wrong warp glitch',
  },
  {
    title: 'Pomeg berry corruption',
    game_name: 'Pokemon Emerald',
    platform: 'retro',
    tags: 'pomeg, corruption, pokemon',
    description: 'HP underflow via Pomeg Berries enables memory glitches and arbitrary effects.',
    youtubeQuery: 'Pokemon Emerald pomeg glitch',
  },
  {
    title: 'Out of bounds clip',
    game_name: 'Portal',
    platform: 'pc',
    tags: 'clip, out of bounds, portal',
    description: 'Portal placement and movement can clip through walls to reach test chambers early.',
    youtubeQuery: 'Portal out of bounds glitch',
  },
  {
    title: 'Infinite jump',
    game_name: 'Sonic Adventure 2',
    platform: 'retro',
    tags: 'movement, infinite jump, sonic',
    description: 'Character-specific movement allows repeated jumps to bypass level design.',
    youtubeQuery: 'Sonic Adventure 2 infinite jump glitch',
  },
  {
    title: 'Clip through geometry',
    game_name: 'Apex Legends',
    platform: 'pc',
    tags: 'clip, geometry, apex',
    description: 'Certain terrain and props can be clipped through, enabling unfair angles.',
    youtubeQuery: 'Apex Legends wall glitch',
  },
  {
    title: 'Physics launch chain',
    game_name: 'Grand Theft Auto V',
    platform: 'pc',
    tags: 'physics, launch, gta5',
    description: 'Vehicle collisions can spin up into massive launches and ragdoll chaos.',
    youtubeQuery: 'GTA 5 physics launch glitch',
  },
  {
    title: 'Horse launch glitch',
    game_name: 'Red Dead Redemption 2',
    platform: 'ps5',
    tags: 'physics, launch, rdr2',
    description: 'Object collisions can slingshot the horse and rider into the air.',
    youtubeQuery: 'Red Dead Redemption 2 horse launch glitch',
  },
  {
    title: 'Memory storage setup',
    game_name: 'The Legend of Zelda: Breath of the Wild',
    platform: 'switch',
    tags: 'memory storage, speedrun, botw',
    description: 'State storage techniques let you keep effects between loads for skips.',
    youtubeQuery: 'BOTW memory storage glitch',
  },
  {
    title: 'Revolver Ocelot knockback launch',
    game_name: 'Metal Gear Solid',
    platform: 'retro',
    tags: 'physics, launch, mgs',
    description: 'Specific interactions can cause large knockback and out-of-bounds behavior.',
    youtubeQuery: 'Metal Gear Solid out of bounds glitch',
  },
  {
    title: 'Rocket jump to unintended spots',
    game_name: 'Team Fortress 2',
    platform: 'pc',
    tags: 'movement, rocket jump, tf2',
    description: 'High-skill movement enables routes that look like map breaks.',
    youtubeQuery: 'TF2 rocket jump glitch spot',
  },
  {
    title: 'Infinite rockets with timing',
    game_name: 'Doom (1993)',
    platform: 'retro',
    tags: 'duplication, ammo, doom',
    description: 'Ammo counters can desync with rapid pickups, leading to overflow.',
    youtubeQuery: 'Doom 1993 ammo overflow glitch',
  },
  {
    title: 'Item dupe with storage trick',
    game_name: 'Dark Souls',
    platform: 'retro',
    tags: 'duplication, inventory, dark souls',
    description: 'Menu storage tricks can duplicate consumables under the right timing.',
    youtubeQuery: 'Dark Souls item duplication glitch',
  },
  {
    title: 'Out of bounds with zip glitch',
    game_name: 'The Legend of Zelda: A Link to the Past',
    platform: 'retro',
    tags: 'zip, out of bounds, zelda',
    description: 'Diagonal movement and collision allow the player to zip through walls.',
    youtubeQuery: 'A Link to the Past zip glitch',
  },
  {
    title: 'Under map with shield clip',
    game_name: 'The Legend of Zelda: Breath of the Wild',
    platform: 'switch',
    tags: 'shield clip, out of bounds, botw',
    description: 'Shield surf and corner angles can push Link through geometry.',
    youtubeQuery: 'BOTW shield clip glitch',
  },
  {
    title: 'Animation cancel speed boost',
    game_name: 'Elden Ring',
    platform: 'ps5',
    tags: 'movement, animation cancel, elden ring',
    description: 'Animation canceling can increase speed and open sequence breaks.',
    youtubeQuery: 'Elden Ring animation cancel speed glitch',
  },
  {
    title: 'Inventory overflow to skip',
    game_name: 'Resident Evil 4',
    platform: 'retro',
    tags: 'inventory, overflow, re4',
    description: 'Inventory manipulation can cause state corruption and skip triggers.',
    youtubeQuery: 'Resident Evil 4 inventory overflow glitch',
  },
];

function expandToCount(baseSeeds, targetCount) {
  if (baseSeeds.length >= targetCount) return baseSeeds.slice(0, targetCount);

  const templates = [
    {
      suffix: ' (alternate route)',
      extraTag: 'route',
      descAddon: 'Alternate route with slightly different setup timing.',
    },
    {
      suffix: ' (stable setup)',
      extraTag: 'setup',
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
  const targetCount = 50;
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
