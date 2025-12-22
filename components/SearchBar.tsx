'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const fallbackLang = envLang === 'en' || envLang === 'ja' ? envLang : '';
  const lang = (langParam === 'en' || langParam === 'ja' ? langParam : fallbackLang) || 'ja';
  const isEnglish = lang === 'en';
  const shouldIncludeLang = Boolean(langParam || fallbackLang);
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const labels = isEnglish
    ? {
        placeholder: 'Search by game, tag, or platform...',
        clear: 'Clear',
        search: 'Search',
      }
    : {
        placeholder: 'ゲーム名 / タグ / 機種で検索...',
        clear: 'クリア',
        search: '検索',
      };

  const createUrl = (nextQuery?: string) => {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (shouldIncludeLang) params.set('lang', lang);
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : '/';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(createUrl(trimmed || undefined));
  };

  const handleClear = () => {
    setQuery('');
    router.push(createUrl());
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="search-bar__input"
        placeholder={labels.placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button type="button" className="search-bar__clear" onClick={handleClear} aria-label={labels.clear}>
          ×
        </button>
      )}
      <button type="submit" className="search-bar__button">
        {labels.search}
      </button>
    </form>
  );
}
