import { NextResponse } from 'next/server';

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  const manifest = {
    accountAssociation: {
      header: process.env.FARCASTER_HEADER || '',
      payload: process.env.FARCASTER_PAYLOAD || '',
      signature: process.env.FARCASTER_SIGNATURE || '',
    },
    miniapp: {
      version: '1',
      name: 'Glitch Hunter Library',
      homeUrl: baseUrl,
      iconUrl: `${baseUrl}/icon.png`,
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#121212',
      subtitle: 'Game glitch archive on Base',
      description: 'A small onchain library for weird game glitches.',
      primaryCategory: 'gaming',
      tags: ['games', 'glitch', 'base', 'miniapp'],
      heroImageUrl: `${baseUrl}/og.png`,
      ogTitle: 'Glitch Hunter Library',
      ogDescription: 'Post and upvote strange game glitches on Base.',
      ogImageUrl: `${baseUrl}/og.png`,
    },
  };

  return NextResponse.json(manifest);
}
