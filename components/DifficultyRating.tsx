'use client';

interface DifficultyRatingProps {
  difficulty: number | null | undefined;
  maxDifficulty?: number;
  showLabel?: boolean;
  editable?: boolean;
  onChange?: (difficulty: number) => void;
}

export default function DifficultyRating({
  difficulty,
  maxDifficulty = 5,
  showLabel = false,
  editable = false,
  onChange,
}: DifficultyRatingProps) {
  const currentDifficulty = difficulty ?? 3;

  const getDifficultyLabel = (level: number): string => {
    if (level <= 1) return 'Very Easy';
    if (level <= 2) return 'Easy';
    if (level <= 3) return 'Medium';
    if (level <= 4) return 'Hard';
    return 'Very Hard';
  };

  const handleClick = (index: number) => {
    if (editable && onChange) {
      onChange(index + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (editable && onChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onChange(index + 1);
    }
  };

  return (
    <div className="difficulty-rating" role={editable ? 'group' : undefined} aria-label="Difficulty rating">
      {Array.from({ length: maxDifficulty }).map((_, index) => (
        <span
          key={index}
          className={`difficulty-rating__star ${index < currentDifficulty ? 'difficulty-rating__star--filled' : ''}`}
          onClick={() => handleClick(index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          aria-label={editable ? `${index + 1} stars` : undefined}
          style={editable ? { cursor: 'pointer' } : undefined}
        >
          ★
        </span>
      ))}
      {showLabel && (
        <span className="difficulty-rating__label">
          {getDifficultyLabel(currentDifficulty)}
        </span>
      )}
    </div>
  );
}
