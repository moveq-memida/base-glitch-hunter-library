'use client';

import Link from 'next/link';
import TierBadge from './TierBadge';
import { type UserTier } from '@/lib/ranking';

interface LeaderboardEntry {
  rank: number;
  id: number;
  displayName: string | null;
  walletAddress: string | null;
  avatarUrl?: string | null;
  tier: UserTier;
  reputationPoints?: number;
  totalSubmissions?: number;
  glitchCount?: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  showPoints?: boolean;
  showGlitchCount?: boolean;
}

export default function LeaderboardTable({
  entries,
  showPoints = true,
  showGlitchCount = false,
}: LeaderboardTableProps) {
  const getRankClass = (rank: number) => {
    if (rank === 1) return 'leaderboard-table__rank--1';
    if (rank === 2) return 'leaderboard-table__rank--2';
    if (rank === 3) return 'leaderboard-table__rank--3';
    return '';
  };

  const formatAddress = (address: string | null) => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <table className="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Hunter</th>
          <th>Tier</th>
          {showPoints && <th>Points</th>}
          {showGlitchCount && <th>Glitches</th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td className={`leaderboard-table__rank ${getRankClass(entry.rank)}`}>
              {entry.rank}
            </td>
            <td>
              <Link href={`/profile/${entry.id}`} className="leaderboard-table__user">
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt=""
                    className="leaderboard-table__avatar"
                  />
                ) : (
                  <div className="leaderboard-table__avatar" />
                )}
                <div>
                  <div className="leaderboard-table__name">
                    {entry.displayName || formatAddress(entry.walletAddress)}
                  </div>
                  {entry.displayName && entry.walletAddress && (
                    <div className="leaderboard-table__address">
                      {formatAddress(entry.walletAddress)}
                    </div>
                  )}
                </div>
              </Link>
            </td>
            <td>
              <TierBadge tier={entry.tier} />
            </td>
            {showPoints && (
              <td className="leaderboard-table__points">
                {entry.reputationPoints?.toLocaleString() || 0}
              </td>
            )}
            {showGlitchCount && (
              <td className="leaderboard-table__points">
                {entry.glitchCount?.toLocaleString() || entry.totalSubmissions?.toLocaleString() || 0}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
