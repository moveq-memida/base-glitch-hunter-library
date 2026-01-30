import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import PopularGlitches from '@/components/PopularGlitches';
import { MiniKitReady } from '@/components/MiniKitReady';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import RandomGlitchButton from '@/components/RandomGlitchButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Glitch Hunter Library - Game Glitch Archive' },
  description: 'Archive of game glitches and exploits. Submit, vote, and verify discoveries on-chain.',
  alternates: { canonical: '/' },
};

const PAGE_SIZE = 20;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

async function getDailyFeaturedGlitch(glitches: Array<{ id: number }>, now: Date = new Date()) {
  if (!glitches.length) return null;
  const dayKey = now.toISOString().slice(0, 10);
  const existing = await prisma.dailyFeatured.findUnique({ where: { day: dayKey }, select: { glitch_id: true } });
  if (existing?.glitch_id) {
    const stored = await prisma.glitch.findUnique({ where: { id: existing.glitch_id } });
    if (stored) return stored;
    await prisma.dailyFeatured.delete({ where: { day: dayKey } });
  }
  const index = hashString(dayKey) % glitches.length;
  const pickId = glitches[index].id;
  try {
    await prisma.dailyFeatured.create({ data: { day: dayKey, glitch_id: pickId } });
  } catch {}
  return prisma.glitch.findUnique({ where: { id: pickId } });
}

async function getStats() {
  try {
    const [totalGlitches, stampedGlitches, totalGames] = await Promise.all([
      prisma.glitch.count(),
      prisma.glitch.count({ where: { stamp_tx_hash: { not: null } } }),
      prisma.glitch.groupBy({ by: ['game_name'], orderBy: { game_name: 'asc' } }).then(r => r.length),
    ]);
    return { totalGlitches, stampedGlitches, totalGames };
  } catch {
    return { totalGlitches: 0, stampedGlitches: 0, totalGames: 0 };
  }
}

async function getAllGlitchesForRanking() {
  try {
    const glitches = await prisma.glitch.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, title: true, game_name: true, platform: true, tags: true, video_url: true, onchain_glitch_id: true, stamp_tx_hash: true },
    });
    return { glitches, error: false };
  } catch (error) {
    console.error('Error fetching glitches for ranking:', error);
    return { glitches: [], error: true };
  }
}

async function getGlitches(query?: string, page: number = 1, categoryFilter?: string) {
  try {
    const skip = (page - 1) * PAGE_SIZE;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];
    if (query) {
      conditions.push({
        OR: [
          { game_name: { contains: query, mode: 'insensitive' as const } },
          { title: { contains: query, mode: 'insensitive' as const } },
          { tags: { contains: query, mode: 'insensitive' as const } },
          { platform: { contains: query, mode: 'insensitive' as const } },
        ],
      });
    }
    if (categoryFilter && categoryFilter !== 'ALL') {
      conditions.push({ speedrun_category: categoryFilter });
    }
    const where = conditions.length > 0 ? { AND: conditions } : undefined;
    const [glitches, total] = await Promise.all([
      prisma.glitch.findMany({ take: PAGE_SIZE, skip, orderBy: { created_at: 'desc' }, where }),
      prisma.glitch.count({ where }),
    ]);
    return { glitches, totalPages: Math.ceil(total / PAGE_SIZE), error: false };
  } catch (error) {
    console.error('Error fetching glitches:', error);
    return { glitches: [], totalPages: 0, error: true };
  }
}

interface HomePageProps {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, page, category } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const [{ glitches, totalPages, error: listError }, ranking, stats] = await Promise.all([
    getGlitches(q, currentPage, category),
    getAllGlitchesForRanking(),
    getStats(),
  ]);
  const { glitches: allGlitches } = ranking;
  const featured = !q && currentPage === 1 ? await getDailyFeaturedGlitch(allGlitches) : null;

  const categoryOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'ANY_PERCENT', label: 'Any%' },
    { value: 'HUNDRED_PERCENT', label: '100%' },
    { value: 'LOW_PERCENT', label: 'Low%' },
    { value: 'GLITCHLESS', label: 'Glitchless' },
    { value: 'ALL_BOSSES', label: 'All Bosses' },
  ];

  const buildUrl = (next: { q?: string | null; page?: string | null; retry?: string; category?: string | null } = {}) => {
    const params = new URLSearchParams();
    const nextQuery = next.q !== undefined ? next.q : q;
    const nextPage = next.page !== undefined ? next.page : page;
    const nextCategory = next.category !== undefined ? next.category : category;
    if (nextQuery) params.set('q', nextQuery);
    if (nextPage && nextPage !== '1') params.set('page', nextPage);
    if (next.retry) params.set('retry', next.retry);
    if (nextCategory && nextCategory !== 'ALL') params.set('category', nextCategory);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  const clearSearchHref = buildUrl({ q: '', page: '1' });
  const retryHref = buildUrl({ retry: Date.now().toString() });
  const displayGlitches = !q && currentPage === 1 && featured ? glitches.filter((g) => g.id !== featured.id) : glitches;
  const hasListError = listError && displayGlitches.length === 0;

  return (
    <div className="page">
      <MiniKitReady />
      <Header />

      <main className="page-main">
        {/* HERO */}
        {!q && currentPage === 1 && (
          <div className="hero">
            <h1 className="hero__title">GLITCH HUNTER LIBRARY</h1>
            <p className="hero__subtitle">
              Community archive of game glitches and exploits. Document discoveries, vote on entries, and stamp proof on Base blockchain.
            </p>

            <div className="hero__stats">
              <table>
                <tbody>
                  <tr>
                    <td>
                      <div className="stat-value">{stats.totalGlitches}</div>
                      <div className="stat-label">Entries</div>
                    </td>
                    <td>
                      <div className="stat-value">{stats.stampedGlitches}</div>
                      <div className="stat-label">Stamped</div>
                    </td>
                    <td>
                      <div className="stat-value">{stats.totalGames}</div>
                      <div className="stat-label">Games</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="hero__actions">
              <Link href="/submit" className="button-primary">Submit New Entry</Link>
              {allGlitches.length > 0 && <RandomGlitchButton ids={allGlitches.map((g) => g.id)} />}
            </div>
          </div>
        )}

        {/* FEATURED */}
        {!q && currentPage === 1 && featured && (
          <>
            <div className="section-header">
              <h2 className="section-header__title">TODAY&apos;S FEATURED</h2>
            </div>
            <div className="glitch-list" style={{ marginBottom: '1.5rem' }}>
              <GlitchCard glitch={featured} />
            </div>
          </>
        )}

        {/* POPULAR */}
        {!q && currentPage === 1 && (
          <Suspense fallback={<p className="loading-inline"><span className="loading-spinner" /> Loading popular entries...</p>}>
            <PopularGlitches glitches={allGlitches} />
          </Suspense>
        )}

        <hr />

        {/* SEARCH */}
        <Suspense fallback={<p className="loading-inline">Loading search...</p>}>
          <SearchBar />
        </Suspense>

        {/* CATEGORY FILTER */}
        <div className="category-filter">
          {categoryOptions.map((opt, i) => (
            <span key={opt.value}>
              <Link
                href={buildUrl({ category: opt.value, page: '1' })}
                className={`category-filter__item ${(category || 'ALL') === opt.value ? 'category-filter__item--active' : ''}`}
              >
                {opt.label}
              </Link>
              {i < categoryOptions.length - 1 && ' '}
            </span>
          ))}
        </div>

        {/* SEARCH RESULT */}
        {q && <p><strong>Search results for &quot;{q}&quot;</strong></p>}

        {/* SECTION HEADER */}
        <div className="section-header">
          <h2 className="section-header__title">{q ? 'SEARCH RESULTS' : 'RECENT ENTRIES'}</h2>
        </div>

        {/* GLITCH LIST */}
        <div className="glitch-list">
          {hasListError ? (
            <div className="empty-state">
              <h3 className="empty-state__title">Error loading data</h3>
              <p className="empty-state__copy">Could not load entries. Please try again.</p>
              <div className="empty-state__actions">
                <Link href={retryHref} className="button-secondary">Retry</Link>
              </div>
            </div>
          ) : displayGlitches.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state__title">No entries found</h3>
              <p className="empty-state__copy">
                {q ? `No entries match "${q}".` : 'No glitches have been submitted yet. Be the first!'}
              </p>
              <div className="empty-state__actions">
                <Link href="/submit" className="button-primary">Submit an entry</Link>
                {q && <Link href={clearSearchHref} className="button-secondary">Clear search</Link>}
              </div>
            </div>
          ) : (
            displayGlitches.map((glitch) => <GlitchCard key={glitch.id} glitch={glitch} />)
          )}
        </div>

        <Suspense fallback={null}>
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
