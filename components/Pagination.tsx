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

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', page.toString());
    return `/?${params.toString()}`;
  };

  return (
    <nav className="pagination">
      {currentPage > 1 && (
        <Link href={createPageUrl(currentPage - 1)} className="pagination__link">
          ← Prev
        </Link>
      )}

      <span className="pagination__info">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages && (
        <Link href={createPageUrl(currentPage + 1)} className="pagination__link">
          Next →
        </Link>
      )}
    </nav>
  );
}
