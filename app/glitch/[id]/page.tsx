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

export default async function GlitchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const glitch = await getGlitch(id);

  return <GlitchDetailClient glitch={glitch} />;
}
