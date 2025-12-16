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
}

interface GlitchCardProps {
  glitch: GlitchCardData;
  compact?: boolean;
}

function getYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;

  // YouTube patterns: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
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
  const thumbnailUrl = getYouTubeThumbnail(glitch.video_url);
  const stampTxUrl = glitch.stamp_tx_hash ? `https://basescan.org/tx/${glitch.stamp_tx_hash}` : null;

  return (
    <Link href={`/glitch/${glitch.id}`} className={`glitch-card ${compact ? 'glitch-card--compact' : ''}`}>
      <div className="glitch-card__thumb">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={glitch.title}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span>動画なし</span>
        )}
      </div>
      <div className="glitch-card__body">
        <div className="glitch-card__meta">
          {glitch.game_name} / {glitch.platform}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-xs)' }}>
          <h3 className="glitch-card__title" style={{ margin: 0, minWidth: 0 }}>
            {glitch.title}
          </h3>
          {stampTxUrl && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
              <span className="tag-badge" style={{ borderColor: 'var(--c-success)', color: 'var(--c-success)' }}>
                ✅ Stamped
              </span>
              <span
                className="tag-badge"
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
                Tx
              </span>
            </span>
          )}
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
          <div className="glitch-card__vote">▲ {glitch.voteCount} 票</div>
        )}
      </div>
    </Link>
  );
}
