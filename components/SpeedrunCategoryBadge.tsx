'use client';

export type SpeedrunCategory =
  | 'ANY_PERCENT'
  | 'HUNDRED_PERCENT'
  | 'LOW_PERCENT'
  | 'GLITCHLESS'
  | 'ALL_BOSSES'
  | 'OTHER';

interface SpeedrunCategoryBadgeProps {
  category: SpeedrunCategory | string | null | undefined;
}

const CATEGORY_CONFIG: Record<SpeedrunCategory, { label: string; className: string }> = {
  ANY_PERCENT: { label: 'Any%', className: 'speedrun-category-badge--any-percent' },
  HUNDRED_PERCENT: { label: '100%', className: 'speedrun-category-badge--hundred-percent' },
  LOW_PERCENT: { label: 'Low%', className: 'speedrun-category-badge--low-percent' },
  GLITCHLESS: { label: 'Glitchless', className: 'speedrun-category-badge--glitchless' },
  ALL_BOSSES: { label: 'All Bosses', className: 'speedrun-category-badge--all-bosses' },
  OTHER: { label: 'Other', className: '' },
};

export default function SpeedrunCategoryBadge({ category }: SpeedrunCategoryBadgeProps) {
  if (!category) return null;

  const config = CATEGORY_CONFIG[category as SpeedrunCategory];
  if (!config) return null;

  return (
    <span className={`speedrun-category-badge ${config.className}`}>
      {config.label}
    </span>
  );
}

export function getAllCategories(): { value: SpeedrunCategory; label: string }[] {
  return Object.entries(CATEGORY_CONFIG).map(([value, config]) => ({
    value: value as SpeedrunCategory,
    label: config.label,
  }));
}
