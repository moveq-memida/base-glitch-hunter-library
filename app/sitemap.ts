import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://memida.xyz';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1時間キャッシュ

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  try {
    const { prisma } = await import('@/lib/prisma');
    const glitches = await prisma.glitch.findMany({
      select: {
        id: true,
        created_at: true,
        updated_at: true,
      },
    });

    const glitchEntries: MetadataRoute.Sitemap = glitches.map((glitch) => ({
      url: `${appUrl}/glitch/${glitch.id}`,
      lastModified: glitch.updated_at ?? glitch.created_at,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [
      {
        url: appUrl,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${appUrl}/submit`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${appUrl}/terms`,
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.2,
      },
      ...glitchEntries,
    ];
  } catch (error) {
    console.error('Failed to build sitemap:', error);
    return [
      { url: appUrl, lastModified: now },
      { url: `${appUrl}/submit`, lastModified: now },
      { url: `${appUrl}/terms`, lastModified: now },
    ];
  }
}
