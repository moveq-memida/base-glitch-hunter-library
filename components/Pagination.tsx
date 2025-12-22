'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const langParam = searchParams.get('lang');
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const fallbackLang = envLang === 'en' || envLang === 'ja' ? envLang : '';
  const lang = (langParam === 'en' || langParam === 'ja' ? langParam : fallbackLang) || 'ja';
  const isEnglish = lang === 'en';
  const shouldIncludeLang = Boolean(langParam || fallbackLang);

  if (totalPages <= 1) return null;

  const labels = isEnglish
    ? {
        previous: '← Prev',
        next: 'Next →',
        page: 'Page',
      }
    : {
        previous: '← 前へ',
        next: '次へ →',
        page: 'ページ',
      };

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (shouldIncludeLang) params.set('lang', lang);
    params.set('page', page.toString());
    return `/?${params.toString()}`;
  };

  return (
    <nav className="pagination">
      {currentPage > 1 && (
        <Link href={createPageUrl(currentPage - 1)} className="pagination__link">
          {labels.previous}
        </Link>
      )}

      <span className="pagination__info">
        {labels.page} {currentPage} / {totalPages}
      </span>

      {currentPage < totalPages && (
        <Link href={createPageUrl(currentPage + 1)} className="pagination__link">
          {labels.next}
        </Link>
      )}
    </nav>
  );
}
