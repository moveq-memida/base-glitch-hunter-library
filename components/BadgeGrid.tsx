'use client';

interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
  awardedAt?: string | Date;
}

interface BadgeGridProps {
  badges: Badge[];
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <p className="badge-grid__empty">
        No badges yet
      </p>
    );
  }

  return (
    <div className="badge-grid">
      {badges.map((badge) => (
        <div key={badge.id} className="badge-grid__item" title={badge.description}>
          {badge.iconUrl ? (
            <img src={badge.iconUrl} alt="" className="badge-grid__icon" />
          ) : (
            <div className="badge-grid__icon badge-grid__icon--default">
              🏆
            </div>
          )}
          <span className="badge-grid__name">{badge.name}</span>
        </div>
      ))}
    </div>
  );
}
