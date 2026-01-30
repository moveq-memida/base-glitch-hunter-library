'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface GlitchCardData {
  id: string | number;
  title: string;
  game_name: string;
  platform: string;
  tags: string;
  video_url?: string | null;
  voteCount?: number;
  stamp_tx_hash?: string | null;
  author_address?: string;
  created_at?: string | Date;
  speedrun_category?: string | null;
  difficulty?: number | null;
}

interface GlitchCardProps {
  glitch: GlitchCardData;
  compact?: boolean;
}

function getYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  return null;
}

export default function GlitchCard({ glitch, compact = false }: GlitchCardProps) {
  const tags = glitch.tags ? glitch.tags.split(',').map(tag => tag.trim()) : [];
  const thumbnailUrl = getYouTubeThumbnail(glitch.video_url) || '';
  const [thumbError, setThumbError] = useState(false);
  const stampTxUrl = glitch.stamp_tx_hash ? `https://basescan.org/tx/${glitch.stamp_tx_hash}` : null;
  const showThumbnail = thumbnailUrl.length > 0 && !thumbError;

  return (
    <Link href={`/glitch/${glitch.id}`} className={`glitch-card ${compact ? 'glitch-card--compact' : ''}`}>
      <div className="glitch-card__thumb">
        {showThumbnail ? (
          <Image
            src={thumbnailUrl}
            alt={glitch.title}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            style={{ objectFit: 'cover' }}
            onError={() => setThumbError(true)}
          />
        ) : (
          <span>No video</span>
        )}
      </div>
      <div className="glitch-card__body">
        <div className="glitch-card__meta">
          {glitch.game_name} / {glitch.platform}
        </div>
        <h3 className="glitch-card__title" style={{ margin: '0 0 var(--sp-xs)' }}>
          {glitch.title}
        </h3>
        <div className="glitch-card__stamp-row">
          {stampTxUrl ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
            <span className="tag-badge tag-badge--success">Stamped</span>
            <span
              className="tag-badge tag-badge--tx"
              role="link"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(stampTxUrl, '_blank', 'noopener,noreferrer');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(stampTxUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              aria-label="Tx on BaseScan"
              title="Tx on BaseScan"
            >
              Tx <span className="tag-badge__icon" aria-hidden="true">↗</span>
            </span>
            </div>
          ) : null}
        </div>
        {tags.length > 0 && (
          <div className="glitch-card__tags">
            {tags.map((tag, index) => (
              <span key={index} className="tag-badge">
                {tag}
              </span>
            ))}
          </div>
        )}
        {glitch.voteCount !== undefined && (
          <div className="glitch-card__vote">
            {glitch.voteCount} votes
          </div>
        )}
        {glitch.author_address && (
          <div className="glitch-card__discoverer">
            <span className="glitch-card__discoverer-icon" aria-hidden="true">◈</span>
            <span className="glitch-card__discoverer-address">
              {glitch.author_address.slice(0, 6)}...{glitch.author_address.slice(-4)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
