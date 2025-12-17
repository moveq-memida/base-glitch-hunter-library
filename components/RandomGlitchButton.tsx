'use client';

import { useRouter } from 'next/navigation';

export default function RandomGlitchButton({ ids }: { ids: Array<number | string> }) {
  const router = useRouter();

  if (!ids || ids.length === 0) return null;

  return (
    <button
      type="button"
      className="search-bar__button"
      style={{ width: '100%' }}
      onClick={() => {
        const index = Math.floor(Math.random() * ids.length);
        const id = ids[index];
        router.push(`/glitch/${id}`);
      }}
    >
      🎲 ランダムなバグ
    </button>
  );
}
