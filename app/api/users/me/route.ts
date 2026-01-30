import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserByWallet, updateUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySIWESignature } from '@/lib/siwe';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rateLimit';

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

    const user = await getOrCreateUserByWallet(walletAddress);

    // Get user's badges
    const userBadges = await prisma.userBadge.findMany({
      where: { user_id: user.id },
      include: { badge: true },
    });

    return NextResponse.json({
      id: user.id,
      walletAddress: user.wallet_address,
      email: user.email,
      discordId: user.discord_id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      tier: user.tier,
      reputationPoints: user.reputation_points,
      totalSubmissions: user.total_submissions,
      totalVotesReceived: user.total_votes_received,
      totalStamps: user.total_stamps,
      badges: userBadges.map((ub) => ({
        id: ub.badge.id,
        code: ub.badge.code,
        nameEn: ub.badge.name_en,
        nameJa: ub.badge.name_ja,
        awardedAt: ub.awarded_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimitKey = getRateLimitKey(request, 'profile-update');
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.profileUpdate);

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
    const { walletAddress, displayName, bio, avatarUrl, message, signature } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Require signature verification for profile updates
    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Signature required for profile updates' },
        { status: 401 }
      );
    }

    // Verify the signature
    const verification = await verifySIWESignature(
      message,
      signature as `0x${string}`,
      walletAddress
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid signature' },
        { status: 401 }
      );
    }

    const existingUser = await getOrCreateUserByWallet(walletAddress);

    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        display_name: displayName !== undefined ? displayName : existingUser.display_name,
        bio: bio !== undefined ? bio : existingUser.bio,
        avatar_url: avatarUrl !== undefined ? avatarUrl : existingUser.avatar_url,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      displayName: updatedUser.display_name,
      bio: updatedUser.bio,
      avatarUrl: updatedUser.avatar_url,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
