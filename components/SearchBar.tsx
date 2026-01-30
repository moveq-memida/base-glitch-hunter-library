'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const createUrl = (nextQuery?: string) => {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
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
        placeholder="Search by game, tag, or platform..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button type="button" className="search-bar__clear" onClick={handleClear} aria-label="Clear">
          ×
        </button>
      )}
      <button type="submit" className="search-bar__button">
        Search
      </button>
    </form>
  );
}
