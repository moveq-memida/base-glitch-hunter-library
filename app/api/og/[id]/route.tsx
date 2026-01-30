import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const glitchId = parseInt(id, 10);

    if (isNaN(glitchId)) {
      return new Response('Invalid ID', { status: 400 });
    }

    // Note: In edge runtime, we can't use Prisma directly
    // This is a simplified version - in production, you'd use an API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://glitchhunter.io';

    // Fetch glitch data via API
    const response = await fetch(`${baseUrl}/api/glitches/${glitchId}`);
    if (!response.ok) {
      return new Response('Glitch not found', { status: 404 });
    }

    const glitch = await response.json();

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            backgroundColor: '#121212',
            padding: '60px',
          }}
        >
          {/* Background decoration */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '400px',
              height: '400px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, transparent 60%)',
              borderRadius: '0 0 0 100%',
            }}
          />

          {/* Logo/Title */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '60px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#8b5cf6',
                letterSpacing: '-0.02em',
              }}
            >
              Glitch Hunter Library
            </span>
          </div>

          {/* Stamp badge if stamped */}
          {glitch.stamp_tx_hash && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '60px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '999px',
                border: '1px solid #22c55e',
              }}
            >
              <span style={{ color: '#22c55e', fontSize: '16px', fontWeight: 600 }}>
                Stamped on Base
              </span>
            </div>
          )}

          {/* Game & Platform */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                color: '#a0a0a0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {glitch.game_name}
            </span>
            <span style={{ color: '#333' }}>|</span>
            <span
              style={{
                fontSize: '20px',
                color: '#a0a0a0',
              }}
            >
              {glitch.platform}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: glitch.title.length > 50 ? '48px' : '64px',
              fontWeight: 800,
              color: '#e0e0e0',
              margin: 0,
              lineHeight: 1.2,
              maxWidth: '1000px',
            }}
          >
            {glitch.title}
          </h1>

          {/* Hunter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '24px',
            }}
          >
            <span style={{ color: '#8b5cf6', fontSize: '18px' }}>◈</span>
            <span style={{ color: '#a0a0a0', fontSize: '18px', fontFamily: 'monospace' }}>
              {glitch.author_address.slice(0, 6)}...{glitch.author_address.slice(-4)}
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('OG Image error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
