import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserByWallet } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitKey = getRateLimitKey(request, 'auth');
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.auth);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const user = await getOrCreateUserByWallet(walletAddress);

    return NextResponse.json({
      id: user.id,
      walletAddress: user.wallet_address,
      displayName: user.display_name,
      tier: user.tier,
      reputationPoints: user.reputation_points,
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const userWithBadges = await prisma.user.findUnique({
      where: { wallet_address: walletAddress },
      include: {
        user_badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!userWithBadges) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: userWithBadges.id,
      walletAddress: userWithBadges.wallet_address,
      displayName: userWithBadges.display_name,
      avatarUrl: userWithBadges.avatar_url,
      bio: userWithBadges.bio,
      tier: userWithBadges.tier,
      reputationPoints: userWithBadges.reputation_points,
      totalSubmissions: userWithBadges.total_submissions,
      totalVotesReceived: userWithBadges.total_votes_received,
      totalStamps: userWithBadges.total_stamps,
      badges: userWithBadges.user_badges.map((ub) => ({
        code: ub.badge.code,
        nameEn: ub.badge.name_en,
        nameJa: ub.badge.name_ja,
        iconUrl: ub.badge.icon_url,
        tier: ub.badge.tier,
        awardedAt: ub.awarded_at,
      })),
    });
  } catch (error) {
    console.error('Auth get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
