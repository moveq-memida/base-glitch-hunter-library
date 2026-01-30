'use client';

interface DiscoveryBadgeProps {
  authorAddress: string;
  createdAt: string | Date;
  stampTxHash?: string | null;
  compact?: boolean;
}

export default function DiscoveryBadge({
  authorAddress,
  createdAt,
  stampTxHash,
  compact = false,
}: DiscoveryBadgeProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const shortAddress = `${authorAddress.slice(0, 6)}...${authorAddress.slice(-4)}`;

  if (compact) {
    return (
      <div className="discovery-badge discovery-badge--compact">
        <span className="discovery-badge__icon" aria-hidden="true">
          {stampTxHash ? '✓' : '◈'}
        </span>
        <span className="discovery-badge__address">{shortAddress}</span>
      </div>
    );
  }

  return (
    <div className="discovery-badge">
      <div className="discovery-badge__header">
        <span className="discovery-badge__icon discovery-badge__icon--large" aria-hidden="true">
          {stampTxHash ? '✓' : '◈'}
        </span>
        <span className="discovery-badge__title">First Discoverer</span>
      </div>
      <div className="discovery-badge__content">
        <div className="discovery-badge__row">
          <span className="discovery-badge__label">Discovered by</span>
          <span className="discovery-badge__value">{shortAddress}</span>
        </div>
        <div className="discovery-badge__row">
          <span className="discovery-badge__label">Discovered on</span>
          <span className="discovery-badge__value">{formattedDate}</span>
        </div>
        {stampTxHash && (
          <div className="discovery-badge__verified">
            <span className="discovery-badge__verified-icon" aria-hidden="true">✓</span>
            <span>Verified on Base</span>
          </div>
        )}
      </div>
    </div>
  );
}
