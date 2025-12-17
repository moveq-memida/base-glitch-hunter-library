/**
 * Seed 50 real-game glitch posts into production DB, while also creating matching
 * onchain GlitchRegistry entries (so voteCount/hasVoted works).
 *
 * Usage (PowerShell):
 *   $env:SEEDER_PRIVATE_KEY="0x..."; node scripts/seed-prod-glitches.mjs --execute
 *
 * Optional:
 *   $env:SEED_TARGET_URL="https://base-glitch-hunter-library.vercel.app"
 *   $env:BASE_RPC_URL="https://mainnet.base.org"
 *   node scripts/seed-prod-glitches.mjs --dry-run
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
] ;

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

const youtubeCachePath = path.join(os.tmpdir(), 'glitch-hunter-youtube-cache.json');
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
  // Pokémon series
  {
    title: 'なぞのばしょに行ける（四天王前）',
    game_name: 'ポケットモンスター ダイヤモンド・パール',
    platform: 'retro',
    tags: '壁抜け, マップ外, なぞのばしょ, ポケモン',
    description:
      '移動系の挙動を利用して、通常は行けない「なぞのばしょ」へ到達できる現象。再現の鍵は“特定位置での移動入力”と“読み込み境界”。動画でルートを確認して同じ手順で試すと分かりやすい。',
    youtubeQuery: 'ポケモン ダイヤモンド パール なぞのばしょ バグ',
  },
  {
    title: 'なみのりで地形をすり抜けてマップ外へ',
    game_name: 'ポケットモンスター ダイヤモンド・パール',
    platform: 'retro',
    tags: 'すり抜け, マップ外, なみのり, ポケモン',
    description:
      'なみのり状態の当たり判定を利用して、壁際から地形の外へ出られることがある。条件が揃うと“足場判定”が崩れて一気に外周へ抜ける。',
    youtubeQuery: 'ポケモン ダイヤモンド パール なみのり すり抜け バグ',
  },
  {
    title: 'GTS/ボックス周りの挙動でポケモン増殖（古典）',
    game_name: 'ポケットモンスター ダイヤモンド・パール',
    platform: 'retro',
    tags: '増殖, バグ, ボックス, ポケモン',
    description:
      '通信やボックス周りのタイミングで、手持ちとボックスの同期がズレて増殖が起きるタイプの古典的な現象。細かい手順が多いので動画の手順通りに。',
    youtubeQuery: 'ポケモン ダイヤモンド パール 増殖 バグ ボックス',
  },
  {
    title: 'MissingNo.で道具が増える（有名すぎるやつ）',
    game_name: 'ポケットモンスター 赤・緑',
    platform: 'retro',
    tags: 'MissingNo, 増殖, セーブ注意, ポケモン',
    description:
      '特定の手順でMissingNo.に遭遇すると、道具の個数が大きく変化する有名バグ。データ破損の報告もあるため検証は自己責任で。',
    youtubeQuery: 'ポケモン 赤 緑 MissingNo 道具 増える',
  },
  {
    title: 'ミュウを入手できる“ミュウバグ”（初代）',
    game_name: 'ポケットモンスター 赤・青',
    platform: 'retro',
    tags: 'ミュウバグ, 乱数, イベント, ポケモン',
    description:
      'トレーナー戦と逃走の状態を利用して、出現テーブルを意図的にずらしミュウを出すテクニック。手順が長いので動画で追うのが確実。',
    youtubeQuery: 'ポケモン 赤 青 ミュウバグ 入手',
  },
  {
    title: 'レベルを一気に上げられる“ふしぎなアメ”系の挙動（RSE）',
    game_name: 'ポケットモンスター エメラルド',
    platform: 'retro',
    tags: '増殖, アイテム, エメラルド, ポケモン',
    description:
      'アイテム増殖や入れ替えを利用して、育成が一気に進む現象。再現条件は“バッグ操作”と“タイミング”。',
    youtubeQuery: 'ポケモン エメラルド アイテム 増殖 バグ',
  },
  {
    title: 'DS版で壁抜け→裏世界に落ちる（古代の裏世界）',
    game_name: 'ポケットモンスター プラチナ',
    platform: 'retro',
    tags: '裏世界, 壁抜け, マップ外, ポケモン',
    description:
      '壁際の当たり判定が薄い場所で移動すると、地形を抜けて裏世界に落ちることがある。落下後は戻れない場合があるので注意。',
    youtubeQuery: 'ポケモン プラチナ 裏世界 壁抜け バグ',
  },

  // Mario / Nintendo
  {
    title: 'BLJ（後ろ向きロングジャンプ）で扉を突破',
    game_name: 'スーパーマリオ64',
    platform: 'retro',
    tags: 'BLJ, 壁抜け, ショートカット, マリオ64',
    description:
      '階段などで後ろ向きロングジャンプを連打して速度を溜め、通常は必要なスター数が要る扉を突破できる有名テクニック。',
    youtubeQuery: 'スーパーマリオ64 BLJ 扉 突破',
  },
  {
    title: '“並行世界（Parallel Universe）”に迷い込む（マリオ64）',
    game_name: 'スーパーマリオ64',
    platform: 'retro',
    tags: 'Parallel Universe, マップ外, 迷い込み, マリオ64',
    description:
      '極端な座標や判定のズレを利用して、通常のマップ外に存在する“並行世界”へ到達する現象。移動がシビアで再現は難しめ。',
    youtubeQuery: 'スーパーマリオ64 Parallel Universe グリッチ',
  },
  {
    title: '月ジャンプ（Moon Jump）で空中を歩く',
    game_name: 'ゼルダの伝説 ブレス オブ ザ ワイルド',
    platform: 'switch',
    tags: 'Moon Jump, 浮遊, 移動, BOTW',
    description:
      '特定の状態異常や判定を利用してジャンプ高度が異常になる現象。空中移動ができて探索が一変する。',
    youtubeQuery: 'ゼルダ BOTW 月ジャンプ バグ',
  },
  {
    title: '盾クリップで壁をすり抜ける（シールドクリップ）',
    game_name: 'ゼルダの伝説 ブレス オブ ザ ワイルド',
    platform: 'switch',
    tags: '盾クリップ, 壁抜け, ショートカット, BOTW',
    description:
      '盾サーフィン等の挙動を利用して壁判定を抜けるテクニック。慣れると神獣や祠のルートが激変する。',
    youtubeQuery: 'BOTW 盾クリップ 壁抜け',
  },
  {
    title: 'アイテム増殖（序盤で量産できるやつ）',
    game_name: 'ゼルダの伝説 ティアーズ オブ ザ キングダム',
    platform: 'switch',
    tags: '増殖, アイテム, ティアキン, TOTK',
    description:
      '装備や所持品の状態更新がズレる瞬間を突いて、アイテムが増えるタイプのバグ。バージョンによって手順が変わるので動画の投稿日も要確認。',
    youtubeQuery: 'ティアキン アイテム 増殖 バグ',
  },
  {
    title: 'ワープの読み込み境界で地形を貫通（ティアキン）',
    game_name: 'ゼルダの伝説 ティアーズ オブ ザ キングダム',
    platform: 'switch',
    tags: '貫通, 判定, 読み込み, ティアキン',
    description:
      'ワープ/読み込みの境界で判定が一瞬消えるような挙動を利用し、地形内へ潜り込む現象。探索勢に刺さる。',
    youtubeQuery: 'ティアキン 地形 貫通 バグ',
  },

  // Minecraft
  {
    title: 'ファーランド（Far Lands）を目指す冒険が成立する',
    game_name: 'Minecraft',
    platform: 'pc',
    tags: 'Far Lands, ワールド端, 生成バグ, マイクラ',
    description:
      '古いバージョンで地形生成が崩壊する“Far Lands”が話題になった現象。現代版でも“端っこ”系の検証は盛り上がる。',
    youtubeQuery: 'Minecraft Far Lands 検証 動画',
  },
  {
    title: 'ピストン/更新順で増殖が起きるタイプ（マイクラ）',
    game_name: 'Minecraft',
    platform: 'pc',
    tags: '増殖, ピストン, 更新順, マイクラ',
    description:
      'ブロック更新の順序や同時処理で、アイテムが複製されることがある。バージョン差が大きいので条件確認が重要。',
    youtubeQuery: 'Minecraft duplication glitch piston',
  },

  // GTA
  {
    title: 'Swing Set Glitchで空の彼方へ（GTA IV）',
    game_name: 'Grand Theft Auto IV',
    platform: 'retro',
    tags: 'Swing Set, 物理演算, 吹き飛び, GTA',
    description:
      '車を特定角度でぶつけると物理演算が暴れて、とんでもない速度で吹き飛ぶ有名バグ。見た目のインパクトが強い。',
    youtubeQuery: 'GTA IV swing set glitch',
  },
  {
    title: '高速で回転して宇宙へ（物理演算が壊れる系）',
    game_name: 'Grand Theft Auto V',
    platform: 'pc',
    tags: '物理演算, 回転, 吹き飛び, GTA5',
    description:
      '乗り物やオブジェクトの干渉で回転が加速し、制御不能になる系の現象。派手で“映える”。',
    youtubeQuery: 'GTA5 physics glitch spinning launch',
  },

  // Skyrim / Bethesda
  {
    title: 'バケツで頭を隠して侵入（NPCの視線が壊れる）',
    game_name: 'The Elder Scrolls V: Skyrim',
    platform: 'pc',
    tags: 'バケツ, ステルス, 判定, Skyrim',
    description:
      'NPCの視線判定を“物理オブジェクト”で妨害して、堂々と盗みに入れる有名ネタ。シンプルで再現しやすい。',
    youtubeQuery: 'Skyrim bucket head stealth glitch',
  },
  {
    title: '巨人に殴られて宇宙へ（Giant Space Program）',
    game_name: 'The Elder Scrolls V: Skyrim',
    platform: 'pc',
    tags: '巨人, 吹き飛び, 物理演算, Skyrim',
    description:
      '巨人の攻撃のノックバックが極端になり、空の彼方へ打ち上げられる現象。毎回笑える。',
    youtubeQuery: 'Skyrim giant space program',
  },

  // FPS / Action
  {
    title: 'ロケットジャンプを極めると“想定外の場所”に行ける',
    game_name: 'Team Fortress 2',
    platform: 'pc',
    tags: 'ロケットジャンプ, 移動, テクニック, TF2',
    description:
      'バグというより“物理の穴”を突く系。加速や判定の抜けを活かして、普通は行けない足場に到達できる。',
    youtubeQuery: 'TF2 rocket jump glitch spot',
  },
  {
    title: '壁抜け/地形抜けが発生する当たり判定（FPSあるある）',
    game_name: 'Apex Legends',
    platform: 'pc',
    tags: '壁抜け, 当たり判定, マップ, Apex',
    description:
      '特定の地形や設置物で当たり判定が破綻し、壁の中に入り込めることがある。修正前後の比較が盛り上がる。',
    youtubeQuery: 'Apex Legends wall glitch',
  },

  // More variety (fill to 50 with templates)
];

function expandToCount(baseSeeds, targetCount) {
  if (baseSeeds.length >= targetCount) return baseSeeds.slice(0, targetCount);

  const templates = [
    {
      suffix: '（別ルート）',
      extraTag: '別ルート',
      descAddon: '別手順でも再現できるパターン。入力タイミングが少し違う。',
    },
    {
      suffix: '（安定化版）',
      extraTag: '安定化',
      descAddon: '再現率を上げるためのコツをまとめた版。動画のコメント欄も参考になる。',
    },
    {
      suffix: '（現行版でも近い現象）',
      extraTag: '現行版',
      descAddon: 'パッチ後でも似た挙動が残っている場合がある。バージョン差の検証が面白い。',
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
      description: `${baseSeed.description}\n\n補足: ${t.descAddon}`,
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
          'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8',
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
  const expandedSeeds = expandToCount(seeds, targetCount);
  const usedVideoIds = new Set();

  console.log(`Seed target: ${seedTargetUrl}`);
  console.log(`Registry: ${registryAddress}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'execute'}`);
  console.log(`Posts: ${expandedSeeds.length}`);

  if (dryRun) {
    const urls = [];
    for (let i = 0; i < expandedSeeds.length; i += 1) {
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
  for (let i = 0; i < expandedSeeds.length; i += 1) {
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
