'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function RandomGlitchButton({ ids }: { ids: Array<number | string> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const fallbackLang = envLang === 'en' || envLang === 'ja' ? envLang : '';
  const lang = (langParam === 'en' || langParam === 'ja' ? langParam : fallbackLang) || 'ja';
  const isEnglish = lang === 'en';
  const shouldIncludeLang = Boolean(langParam || fallbackLang);

  if (!ids || ids.length === 0) return null;

  return (
    <button
      type="button"
      className="search-bar__button"
      style={{ width: '100%', maxWidth: '260px', margin: '0 auto', display: 'block' }}
      onClick={() => {
        const index = Math.floor(Math.random() * ids.length);
        const id = ids[index];
        const suffix = shouldIncludeLang ? `?lang=${lang}` : '';
        router.push(`/glitch/${id}${suffix}`);
      }}
    >
      {isEnglish ? 'Random glitch' : 'ランダムなバグ'}
    </button>
  );
}
