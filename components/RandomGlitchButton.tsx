'use client';

import { useRouter } from 'next/navigation';

export default function RandomGlitchButton({ ids }: { ids: Array<number | string> }) {
  const router = useRouter();

  if (!ids || ids.length === 0) return null;

  return (
    <button
      type="button"
      className="random-button"
      onClick={() => {
        const index = Math.floor(Math.random() * ids.length);
        const id = ids[index];
        router.push(`/glitch/${id}`);
      }}
    >
      RANDOM
    </button>
  );
}
