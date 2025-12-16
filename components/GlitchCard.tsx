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
        <h3 className="glitch-card__title">{glitch.title}</h3>
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
        {glitch.stamp_tx_hash && (
          <div style={{ marginTop: 'var(--sp-xs)' }}>
            <span className="tag-badge">オンチェーン封印済み ✅</span>
          </div>
        )}
      </div>
    </Link>
  );
}
