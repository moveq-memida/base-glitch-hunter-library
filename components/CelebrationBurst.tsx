'use client';

import React from 'react';

interface CelebrationBurstProps {
  variant: 'vote' | 'stamp';
  label?: string;
}

export default function CelebrationBurst({ variant, label }: CelebrationBurstProps) {
  const fallbackLabel = variant === 'vote' ? '投票完了' : 'スタンプ完了';
  const displayLabel = label || fallbackLabel;

  return (
    <div className={`celebrate celebrate--${variant}`} role="presentation" aria-hidden="true">
      <div className="celebrate__burst">
        {Array.from({ length: 14 }).map((_, index) => (
          <span key={index} className="celebrate__piece" style={{ ['--i' as never]: index } as React.CSSProperties} />
        ))}
      </div>
      <div className="celebrate__label">{displayLabel}</div>
    </div>
  );
}
