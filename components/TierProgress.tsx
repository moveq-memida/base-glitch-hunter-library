'use client';

import { getProgressToNextTier, type UserTier } from '@/lib/ranking';

interface TierProgressProps {
  points: number;
}

const TIER_LABELS: Record<UserTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
  LEGENDARY: 'Legendary',
};

export default function TierProgress({ points }: TierProgressProps) {
  const { currentTier, nextTier, currentPoints, pointsForNextTier, progress } =
    getProgressToNextTier(points);

  return (
    <div className="tier-progress">
      <div className="tier-progress__bar">
        <div
          className={`tier-progress__fill tier-progress__fill--${currentTier.toLowerCase()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="tier-progress__labels">
        <span>{TIER_LABELS[currentTier]}</span>
        {nextTier ? (
          <span>
            {currentPoints} / {pointsForNextTier} pts
          </span>
        ) : (
          <span>Max Tier!</span>
        )}
        {nextTier && <span>{TIER_LABELS[nextTier]}</span>}
      </div>
    </div>
  );
}
