import React from 'react';
import GlitchDetailClient from './GlitchDetailClient';
import { prisma } from '@/lib/prisma';

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

export default async function GlitchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const glitch = await getGlitch(id);

  const relatedGlitches = glitch
    ? await getRelatedGlitches(glitch.game_name, glitch.id)
    : [];

  return <GlitchDetailClient glitch={glitch} relatedGlitches={relatedGlitches} />;
}
