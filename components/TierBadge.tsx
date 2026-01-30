'use client';

import { type UserTier } from '@/lib/ranking';

interface TierBadgeProps {
  tier: UserTier | string;
  showLabel?: boolean;
}

const TIER_CONFIG: Record<UserTier, { icon: string; label: string }> = {
  BRONZE: { icon: '🥉', label: 'Bronze' },
  SILVER: { icon: '🥈', label: 'Silver' },
  GOLD: { icon: '🥇', label: 'Gold' },
  PLATINUM: { icon: '💎', label: 'Platinum' },
  DIAMOND: { icon: '💠', label: 'Diamond' },
  LEGENDARY: { icon: '👑', label: 'Legendary' },
};

export default function TierBadge({ tier, showLabel = true }: TierBadgeProps) {
  const normalizedTier = tier as UserTier;
  const config = TIER_CONFIG[normalizedTier] || TIER_CONFIG.BRONZE;

  return (
    <span className={`tier-badge tier-badge--${tier.toLowerCase()}`}>
      <span aria-hidden="true">{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
