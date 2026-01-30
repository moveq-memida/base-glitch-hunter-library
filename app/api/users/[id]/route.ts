import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        wallet_address: true,
        display_name: true,
        avatar_url: true,
        bio: true,
        tier: true,
        reputation_points: true,
        total_submissions: true,
        total_votes_received: true,
        total_stamps: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      walletAddress: user.wallet_address,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      tier: user.tier,
      reputationPoints: user.reputation_points,
      totalSubmissions: user.total_submissions,
      totalVotesReceived: user.total_votes_received,
      totalStamps: user.total_stamps,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
