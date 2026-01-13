import type { Metadata } from 'next';
import React from 'react';
import GlitchDetailClient from './GlitchDetailClient';
import { prisma } from '@/lib/prisma';

function getYouTubeThumbnail(url: string | null): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  return null;
}

async function getGlitch(id: string) {
  try {
    const glitchId = parseInt(id, 10);
    if (isNaN(glitchId)) {
      return null;
    }

    const glitch = await prisma.glitch.findUnique({
      where: { id: glitchId },
    });

    return glitch;
  } catch (error) {
    console.error('Error fetching glitch:', error);
    return null;
  }
}

async function getRelatedGlitches(gameName: string, excludeId: number) {
  try {
    const relatedGlitches = await prisma.glitch.findMany({
      where: {
        game_name: gameName,
        id: { not: excludeId },
      },
      take: 4,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        game_name: true,
        platform: true,
        tags: true,
        video_url: true,
      },
    });
    return relatedGlitches;
  } catch (error) {
    console.error('Error fetching related glitches:', error);
    return [];
  }
}

async function getNextGlitchId(currentId: number) {
  try {
    const next = await prisma.glitch.findFirst({
      where: { id: { gt: currentId } },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (next) return next.id;

    const first = await prisma.glitch.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    return first?.id ?? null;
  } catch (error) {
    console.error('Error fetching next glitch:', error);
    return null;
  }
}

async function getPrevGlitchId(currentId: number) {
  try {
    const prev = await prisma.glitch.findFirst({
      where: { id: { lt: currentId } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    if (prev) return prev.id;

    const last = await prisma.glitch.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return last?.id ?? null;
  } catch (error) {
    console.error('Error fetching previous glitch:', error);
    return null;
  }
}

export default async function GlitchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const glitch = await getGlitch(id);

  const relatedGlitches = glitch
    ? await getRelatedGlitches(glitch.game_name, glitch.id)
    : [];
  const prevGlitchId = glitch ? await getPrevGlitchId(glitch.id) : null;
  const nextGlitchId = glitch ? await getNextGlitchId(glitch.id) : null;
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://memida.xyz';
  const canonicalUrl = glitch ? `${appBaseUrl}/glitch/${glitch.id}` : '';
  const thumbnailUrl = glitch ? getYouTubeThumbnail(glitch.video_url) : null;
  const publishedAt = glitch?.created_at ? new Date(glitch.created_at).toISOString() : undefined;
  const updatedAt = glitch?.updated_at ? new Date(glitch.updated_at).toISOString() : undefined;
  const keywords = glitch?.tags
    ? glitch.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .join(', ')
    : undefined;
  const jsonLd = glitch
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: glitch.title,
        description: glitch.description,
        url: canonicalUrl,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        author: {
          '@type': 'Person',
          name: glitch.author_address || 'Anonymous',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Glitch Hunter Library',
        },
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        ...(updatedAt ? { dateModified: updatedAt } : {}),
        ...(thumbnailUrl ? { image: [thumbnailUrl] } : { image: [`${appBaseUrl}/og.png`] }),
        ...(keywords ? { keywords } : {}),
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <GlitchDetailClient
        glitch={glitch}
        relatedGlitches={relatedGlitches}
        prevGlitchId={prevGlitchId}
        nextGlitchId={nextGlitchId}
      />
    </>
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const glitch = await getGlitch(id);

  if (!glitch) {
    return {
      title: 'Glitch not found',
      description: 'The requested glitch could not be found.',
      alternates: {
        canonical: '/glitch',
      },
      openGraph: {
        title: 'Glitch not found',
        description: 'The requested glitch could not be found.',
        images: ['/og.png'],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Glitch not found',
        description: 'The requested glitch could not be found.',
        images: ['/og.png'],
      },
    };
  }

  const title = `${glitch.title} (${glitch.game_name})`;
  const description = `Glitch in ${glitch.game_name}. Vote it up and stamp a hash proof on Base mainnet.`;
  const canonicalUrl = `/glitch/${glitch.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: ['/og.png'],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.png'],
    },
  };
}
