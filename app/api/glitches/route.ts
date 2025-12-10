import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const glitches = await prisma.glitch.findMany({
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(glitches);
  } catch (error) {
    console.error('Error fetching glitches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch glitches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      game_name,
      platform,
      video_url,
      description,
      tags,
      author_address,
      onchain_glitch_id,
      content_hash,
    } = body;

    // Validate required fields
    if (!title || !game_name || !platform || !description || !author_address || onchain_glitch_id === undefined || !content_hash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const glitch = await prisma.glitch.create({
      data: {
        title,
        game_name,
        platform,
        video_url: video_url || '',
        description,
        tags: tags || '',
        author_address,
        onchain_glitch_id,
        content_hash,
      },
    });

    return NextResponse.json(glitch, { status: 201 });
  } catch (error) {
    console.error('Error creating glitch:', error);
    return NextResponse.json(
      { error: 'Failed to create glitch' },
      { status: 500 }
    );
  }
}
