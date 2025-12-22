/**
 * Find and optionally delete duplicate video_url posts.
 * - Dry run by default.
 * - Requires a filter for execute mode to avoid accidental deletion.
 *
 * Usage:
 *   node scripts/cleanup-duplicate-videos.mjs --dry-run --author=0xabc...
 *   node scripts/cleanup-duplicate-videos.mjs --execute --author=0xabc...
 *   node scripts/cleanup-duplicate-videos.mjs --execute --after-id=50
 *   node scripts/cleanup-duplicate-videos.mjs --execute --created-after=2025-01-01
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getArgValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) {
    return direct.split('=').slice(1).join('=');
  }
  const index = process.argv.indexOf(name);
  if (index !== -1) {
    return process.argv[index + 1];
  }
  return null;
}

function getArgFlag(name) {
  return process.argv.includes(name);
}

function normalizeVideoUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.searchParams.get('v');
      if (id && id.length === 11) return `youtube:${id}`;
    }
    if (host === 'youtu.be') {
      const id = parsed.pathname.replace('/', '');
      if (id && id.length === 11) return `youtube:${id}`;
    }

    const params = new URLSearchParams(parsed.searchParams);
    for (const key of [...params.keys()]) {
      if (key.startsWith('utm_')) params.delete(key);
    }
    const query = params.toString();
    return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return url.trim();
  }
}

async function main() {
  const execute = getArgFlag('--execute');
  const dryRun = getArgFlag('--dry-run') || !execute;
  const author = getArgValue('--author');
  const afterId = Number(getArgValue('--after-id') || 0) || null;
  const createdAfterRaw = getArgValue('--created-after');
  const createdAfter = createdAfterRaw ? new Date(createdAfterRaw) : null;

  if (execute && !author && !afterId && !createdAfter) {
    console.error('Refusing to delete without a filter. Provide --author, --after-id, or --created-after.');
    process.exit(1);
  }

  const where = {
    video_url: { not: null },
    ...(author ? { author_address: author } : {}),
    ...(afterId ? { id: { gt: afterId } } : {}),
    ...(createdAfter && !Number.isNaN(createdAfter.valueOf())
      ? { created_at: { gt: createdAfter } }
      : {}),
  };

  const glitches = await prisma.glitch.findMany({
    where,
    select: {
      id: true,
      title: true,
      video_url: true,
      created_at: true,
      author_address: true,
    },
    orderBy: { created_at: 'asc' },
  });

  const groups = new Map();
  for (const glitch of glitches) {
    const key = normalizeVideoUrl(glitch.video_url);
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(glitch);
    groups.set(key, list);
  }

  const duplicates = [];
  for (const [key, items] of groups.entries()) {
    if (items.length < 2) continue;
    const sorted = [...items].sort((a, b) => {
      const aTime = a.created_at?.getTime?.() ?? 0;
      const bTime = b.created_at?.getTime?.() ?? 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.id - b.id;
    });
    duplicates.push({ key, keep: sorted[0], remove: sorted.slice(1) });
  }

  if (duplicates.length === 0) {
    console.log('No duplicate videos found for the given filter.');
    return;
  }

  let removeCount = 0;
  for (const item of duplicates) {
    removeCount += item.remove.length;
  }

  console.log(`Duplicate groups: ${duplicates.length}`);
  console.log(`Rows to remove: ${removeCount}`);

  for (const item of duplicates) {
    console.log(`\nKeep: [${item.keep.id}] ${item.keep.title}`);
    for (const dupe of item.remove) {
      console.log(` - remove [${dupe.id}] ${dupe.title}`);
    }
  }

  if (dryRun) {
    console.log('\nDry run only. Use --execute to delete.');
    return;
  }

  const removeIds = duplicates.flatMap((item) => item.remove.map((dupe) => dupe.id));
  const result = await prisma.glitch.deleteMany({
    where: { id: { in: removeIds } },
  });

  console.log(`\nDeleted ${result.count} rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
