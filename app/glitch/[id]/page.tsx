import React from 'react';
import GlitchDetailClient from './GlitchDetailClient';

// Force dynamic rendering to avoid static generation issues with Turbopack
export const dynamic = 'force-dynamic';

interface Glitch {
  id: string | number;
  title: string;
  game_name: string;
  platform: string;
  video_url: string;
  description: string;
  tags: string;
  author_address: string;
  onchain_glitch_id: number;
}

async function getGlitch(id: string): Promise<Glitch | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const res = await fetch(`${baseUrl}/api/glitches/${id}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
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
