'use client';

import React from 'react';

export default function CelebrationBurst({ variant }: { variant: 'vote' | 'stamp' }) {
  const label = variant === 'vote' ? '投票完了' : 'スタンプ完了';

  return (
    <div className={`celebrate celebrate--${variant}`} role="presentation" aria-hidden="true">
      <div className="celebrate__burst">
        {Array.from({ length: 14 }).map((_, index) => (
          <span key={index} className="celebrate__piece" style={{ ['--i' as never]: index } as React.CSSProperties} />
        ))}
      </div>
      <div className="celebrate__label">{label}</div>
    </div>
  );
}
