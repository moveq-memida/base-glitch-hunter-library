import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildStampPayload, computeStampHash } from '@/lib/stamp';
import { notifyNewGlitch } from '@/lib/discord';

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
      // New speedrun fields
      speedrun_category,
      difficulty,
      estimated_time_save,
      game_version,
      reproduction_steps,
    } = body;

    // Validate required fields
    if (!title || !game_name || !platform || !description || !author_address || onchain_glitch_id === undefined || !content_hash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const createdAtIso = new Date().toISOString();
    const stampPayload = buildStampPayload({
      title,
      game: game_name,
      videoUrl: video_url || '',
      description,
      createdAtIso,
      authorIdentifier: author_address,
    });
    const stampHash = computeStampHash(stampPayload);

    // Create glitch with reproduction steps in a transaction
    const glitch = await prisma.$transaction(async (tx) => {
      const createdGlitch = await tx.glitch.create({
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
          stamp_hash: stampHash,
          created_at: new Date(createdAtIso),
          // New speedrun fields
          speedrun_category: speedrun_category || 'ANY_PERCENT',
          difficulty: difficulty ?? 3,
          estimated_time_save: estimated_time_save || null,
          game_version: game_version || null,
        },
      });

      // Create reproduction steps if provided
      if (reproduction_steps && Array.isArray(reproduction_steps) && reproduction_steps.length > 0) {
        await tx.reproductionStep.createMany({
          data: reproduction_steps.map((step: { instruction: string; timestamp?: string }, index: number) => ({
            glitch_id: createdGlitch.id,
            step_number: index + 1,
            instruction: step.instruction,
            timestamp: step.timestamp || null,
          })),
        });
      }

      return createdGlitch;
    });

    // Send Discord notification (non-blocking)
    notifyNewGlitch({
      id: glitch.id,
      title: glitch.title,
      gameName: glitch.game_name,
      platform: glitch.platform,
      authorAddress: glitch.author_address,
      videoUrl: glitch.video_url,
      description: glitch.description,
    }).catch((err) => console.error('Discord notification failed:', err));

    return NextResponse.json(glitch, { status: 201 });
  } catch (error) {
    console.error('Error creating glitch:', error);
    return NextResponse.json(
      { error: 'Failed to create glitch' },
      { status: 500 }
    );
  }
}
