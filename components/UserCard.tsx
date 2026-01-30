'use client';

import TierBadge from './TierBadge';
import TierProgress from './TierProgress';
import { type UserTier } from '@/lib/ranking';

interface UserCardProps {
  user: {
    id: number;
    displayName: string | null;
    walletAddress: string | null;
    avatarUrl: string | null;
    bio: string | null;
    tier: UserTier;
    reputationPoints: number;
    totalSubmissions: number;
    totalVotesReceived: number;
    totalStamps: number;
  };
  showProgress?: boolean;
}

export default function UserCard({ user, showProgress = true }: UserCardProps) {
  const formatAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="user-card">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="user-card__avatar" />
      ) : (
        <div className="user-card__avatar" />
      )}
      <div className="user-card__info">
        <div className="user-card__header">
          <h2 className="user-card__name">
            {user.displayName || 'Anonymous Hunter'}
          </h2>
          <TierBadge tier={user.tier} />
        </div>
        {user.walletAddress && (
          <div className="user-card__address">{formatAddress(user.walletAddress)}</div>
        )}
        {user.bio && <p className="user-card__bio">{user.bio}</p>}

        <div className="user-card__stats">
          <div className="user-card__stat">
            <div className="user-card__stat-value">{user.totalSubmissions}</div>
            <div className="user-card__stat-label">Submissions</div>
          </div>
          <div className="user-card__stat">
            <div className="user-card__stat-value">{user.totalVotesReceived}</div>
            <div className="user-card__stat-label">Votes</div>
          </div>
          <div className="user-card__stat">
            <div className="user-card__stat-value">{user.totalStamps}</div>
            <div className="user-card__stat-label">Stamps</div>
          </div>
          <div className="user-card__stat">
            <div className="user-card__stat-value">{user.reputationPoints.toLocaleString()}</div>
            <div className="user-card__stat-label">Points</div>
          </div>
        </div>

        {showProgress && (
          <div style={{ marginTop: '0.75rem' }}>
            <TierProgress points={user.reputationPoints} />
          </div>
        )}
      </div>
    </div>
  );
}
