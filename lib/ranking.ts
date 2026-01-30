import { prisma } from '@/lib/prisma';

export type UserTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'LEGENDARY';

// Point values for different actions
export const POINTS = {
  GLITCH_SUBMISSION: 10,
  VOTE_RECEIVED: 2,
  STAMP_RECEIVED: 25,
  FIRST_SUBMISSION_BONUS: 50,
} as const;

// Tier thresholds
export const TIER_THRESHOLDS: Record<UserTier, { min: number; max: number }> = {
  BRONZE: { min: 0, max: 99 },
  SILVER: { min: 100, max: 499 },
  GOLD: { min: 500, max: 1499 },
  PLATINUM: { min: 1500, max: 4999 },
  DIAMOND: { min: 5000, max: 14999 },
  LEGENDARY: { min: 15000, max: Infinity },
};

export function getTierFromPoints(points: number): UserTier {
  if (points >= TIER_THRESHOLDS.LEGENDARY.min) return 'LEGENDARY';
  if (points >= TIER_THRESHOLDS.DIAMOND.min) return 'DIAMOND';
  if (points >= TIER_THRESHOLDS.PLATINUM.min) return 'PLATINUM';
  if (points >= TIER_THRESHOLDS.GOLD.min) return 'GOLD';
  if (points >= TIER_THRESHOLDS.SILVER.min) return 'SILVER';
  return 'BRONZE';
}

export function getProgressToNextTier(points: number): {
  currentTier: UserTier;
  nextTier: UserTier | null;
  currentPoints: number;
  pointsForNextTier: number;
  progress: number;
} {
  const currentTier = getTierFromPoints(points);

  const tierOrder: UserTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGENDARY'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      currentPoints: points,
      pointsForNextTier: TIER_THRESHOLDS[currentTier].min,
      progress: 100,
    };
  }

  const currentMin = TIER_THRESHOLDS[currentTier].min;
  const nextMin = TIER_THRESHOLDS[nextTier].min;
  const pointsInTier = points - currentMin;
  const pointsNeeded = nextMin - currentMin;
  const progress = Math.min(100, (pointsInTier / pointsNeeded) * 100);

  return {
    currentTier,
    nextTier,
    currentPoints: points,
    pointsForNextTier: nextMin,
    progress,
  };
}

export async function addPointsToUser(
  userId: number,
  pointType: keyof typeof POINTS,
  customPoints?: number
): Promise<{ newPoints: number; newTier: UserTier; tierChanged: boolean }> {
  const points = customPoints ?? POINTS[pointType];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reputation_points: true, tier: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newPoints = user.reputation_points + points;
  const newTier = getTierFromPoints(newPoints);
  const tierChanged = user.tier !== newTier;

  await prisma.user.update({
    where: { id: userId },
    data: {
      reputation_points: newPoints,
      tier: newTier,
    },
  });

  return { newPoints, newTier, tierChanged };
}

export async function recalculateUserStats(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      glitches: {
        select: {
          id: true,
          stamp_tx_hash: true,
        },
      },
      _count: {
        select: {
          votes: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Count total submissions
  const totalSubmissions = user.glitches.length;

  // Count total stamps
  const totalStamps = user.glitches.filter((g) => g.stamp_tx_hash).length;

  // Count votes received on user's glitches
  const votesReceived = await prisma.vote.count({
    where: {
      glitch: {
        user_id: userId,
      },
    },
  });

  // Calculate total points
  let totalPoints = 0;
  totalPoints += totalSubmissions * POINTS.GLITCH_SUBMISSION;
  totalPoints += votesReceived * POINTS.VOTE_RECEIVED;
  totalPoints += totalStamps * POINTS.STAMP_RECEIVED;

  // First submission bonus
  if (totalSubmissions > 0) {
    totalPoints += POINTS.FIRST_SUBMISSION_BONUS;
  }

  const newTier = getTierFromPoints(totalPoints);

  await prisma.user.update({
    where: { id: userId },
    data: {
      total_submissions: totalSubmissions,
      total_votes_received: votesReceived,
      total_stamps: totalStamps,
      reputation_points: totalPoints,
      tier: newTier,
    },
  });
}

export async function getLeaderboard(
  limit: number = 50,
  offset: number = 0
): Promise<Array<{
  rank: number;
  id: number;
  displayName: string | null;
  walletAddress: string | null;
  avatarUrl: string | null;
  tier: UserTier;
  reputationPoints: number;
  totalSubmissions: number;
}>> {
  const users = await prisma.user.findMany({
    orderBy: { reputation_points: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      display_name: true,
      wallet_address: true,
      avatar_url: true,
      tier: true,
      reputation_points: true,
      total_submissions: true,
    },
  });

  return users.map((user, index) => ({
    rank: offset + index + 1,
    id: user.id,
    displayName: user.display_name,
    walletAddress: user.wallet_address,
    avatarUrl: user.avatar_url,
    tier: user.tier as UserTier,
    reputationPoints: user.reputation_points,
    totalSubmissions: user.total_submissions,
  }));
}

export async function getGameLeaderboard(
  gameName: string,
  limit: number = 50,
  offset: number = 0
): Promise<Array<{
  rank: number;
  id: number;
  displayName: string | null;
  walletAddress: string | null;
  tier: UserTier;
  glitchCount: number;
}>> {
  const results = await prisma.glitch.groupBy({
    by: ['user_id'],
    where: {
      game_name: {
        equals: gameName,
        mode: 'insensitive',
      },
      user_id: {
        not: null,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
    skip: offset,
  });

  const userIds = results.map((r) => r.user_id).filter((id): id is number => id !== null);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      display_name: true,
      wallet_address: true,
      tier: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return results
    .filter((r) => r.user_id !== null)
    .map((result, index) => {
      const user = userMap.get(result.user_id!);
      return {
        rank: offset + index + 1,
        id: result.user_id!,
        displayName: user?.display_name || null,
        walletAddress: user?.wallet_address || null,
        tier: (user?.tier as UserTier) || 'BRONZE',
        glitchCount: result._count.id,
      };
    });
}
