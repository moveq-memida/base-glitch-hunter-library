import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, glitchId, userId, metadata } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: 'eventType is required' },
        { status: 400 }
      );
    }

    const event = await prisma.analyticsEvent.create({
      data: {
        event_type: eventType,
        glitch_id: glitchId || null,
        user_id: userId || null,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ id: event.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating analytics event:', error);
    return NextResponse.json(
      { error: 'Failed to create analytics event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType');
    const glitchId = searchParams.get('glitchId');
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (eventType) {
      where.event_type = eventType;
    }
    if (glitchId) {
      where.glitch_id = parseInt(glitchId, 10);
    }

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics events' },
      { status: 500 }
    );
  }
}
