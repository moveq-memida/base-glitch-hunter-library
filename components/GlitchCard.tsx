import Link from 'next/link';

export interface GlitchCardData {
  id: string | number;
  title: string;
  game_name: string;
  platform: string;
  tags: string;
  voteCount?: number;
}

interface GlitchCardProps {
  glitch: GlitchCardData;
  compact?: boolean;
}

export default function GlitchCard({ glitch, compact = false }: GlitchCardProps) {
  const tags = glitch.tags ? glitch.tags.split(',').map(tag => tag.trim()) : [];

  return (
    <Link href={`/glitch/${glitch.id}`} className={`glitch-card ${compact ? 'glitch-card--compact' : ''}`}>
      <div className="glitch-card__thumb">
        No Image
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
          <div className="glitch-card__vote">▲ {glitch.voteCount} votes</div>
        )}
      </div>
    </Link>
  );
}
