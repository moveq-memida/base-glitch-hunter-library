import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const glitchId = parseInt(id);

    if (isNaN(glitchId)) {
      return NextResponse.json(
        { error: 'Invalid glitch ID' },
        { status: 400 }
      );
    }

    const glitch = await prisma.glitch.findUnique({
      where: {
        id: glitchId,
      },
    });

    if (!glitch) {
      return NextResponse.json(
        { error: 'Glitch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(glitch);
  } catch (error) {
    console.error('Error fetching glitch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch glitch' },
      { status: 500 }
    );
  }
}
