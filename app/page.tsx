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

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Glitch Hunter Library' },
  description: 'Discover legendary game glitches, vote them up, and stamp a hash proof on Base mainnet.',
  alternates: {
    canonical: '/',
  },
};

const PAGE_SIZE = 10;

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

  const existing = await prisma.dailyFeatured.findUnique({
    where: { day: dayKey },
    select: { glitch_id: true },
  });

  if (existing?.glitch_id) {
    const stored = await prisma.glitch.findUnique({
      where: { id: existing.glitch_id },
    });
    if (stored) return stored;
    await prisma.dailyFeatured.delete({ where: { day: dayKey } });
  }

  const index = hashString(dayKey) % glitches.length;
  const pickId = glitches[index].id;

  try {
    await prisma.dailyFeatured.create({
      data: {
        day: dayKey,
        glitch_id: pickId,
      },
    });
  } catch {
    // Ignore duplicate creation attempts.
  }

  return prisma.glitch.findUnique({ where: { id: pickId } });
}

async function getAllGlitchesForRanking() {
  try {
    const glitches = await prisma.glitch.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        game_name: true,
        platform: true,
        tags: true,
        video_url: true,
        onchain_glitch_id: true,
        stamp_tx_hash: true,
      },
    });
    return { glitches, error: false };
  } catch (error) {
    console.error('Error fetching glitches for ranking:', error);
    return { glitches: [], error: true };
  }
}

async function getGlitches(query?: string, page: number = 1) {
  try {
    const skip = (page - 1) * PAGE_SIZE;

    const where = query
      ? {
          OR: [
            { game_name: { contains: query, mode: 'insensitive' as const } },
            { title: { contains: query, mode: 'insensitive' as const } },
            { tags: { contains: query, mode: 'insensitive' as const } },
            { platform: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [glitches, total] = await Promise.all([
      prisma.glitch.findMany({
        take: PAGE_SIZE,
        skip,
        orderBy: {
          created_at: 'desc',
        },
        where,
      }),
      prisma.glitch.count({ where }),
    ]);

    return {
      glitches,
      totalPages: Math.ceil(total / PAGE_SIZE),
      error: false,
    };
  } catch (error) {
    console.error('Error fetching glitches:', error);
    return { glitches: [], totalPages: 0, error: true };
  }
}

interface HomePageProps {
  searchParams: Promise<{ q?: string; page?: string; lang?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, page, lang } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const [{ glitches, totalPages, error: listError }, ranking] = await Promise.all([
    getGlitches(q, currentPage),
    getAllGlitchesForRanking(),
  ]);
  const { glitches: allGlitches } = ranking;
  const featured = !q && currentPage === 1 ? await getDailyFeaturedGlitch(allGlitches) : null;

  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const normalizedLang = typeof lang === 'string' ? lang.toLowerCase() : '';
  const resolvedLang =
    normalizedLang === 'en' || normalizedLang === 'ja'
      ? normalizedLang
      : envLang === 'en' || envLang === 'ja'
      ? envLang
      : 'ja';
  const isEnglish = resolvedLang === 'en';
  const shouldIncludeLang = Boolean(normalizedLang || envLang);

  const copy = isEnglish
    ? {
        title: 'The Glitch Archive',
        primaryLine: 'Collect weird game bugs, vote them up, and leave a permanent hash on Base mainnet.',
        secondaryLine: 'The chain stores proof, not the content.',
        steps: ['① Discover', '② Submit', '③ Stamp on Base'],
        proofBadge: 'Onchain hash proof',
        cta: 'Add your glitch',
        headerAction: 'Submit',
        langLabel: 'Language',
        langJa: '日本語',
        langEn: 'English',
        featuredTitle: 'Featured glitch',
        featuredBadge: 'Featured',
        popularTitle: 'Popular glitches',
        popularLoading: 'Loading popular glitches',
        loading: 'Loading',
        searchResult: (query: string) => `Results for "${query}"`,
        listHeadingSearch: 'Search results',
        listHeadingLatest: 'Latest',
        emptyTitle: 'Nothing here yet',
        emptySearchTitle: 'No results',
        emptySearch: (query: string) => `No posts found for "${query}".`,
        emptyFeatured: 'No other recent posts yet.',
        emptyNone: 'No posts yet. Be the first to submit one.',
        emptyCtaSubmit: 'Submit a glitch',
        emptyCtaClear: 'Clear search',
        errorTitle: 'Something went wrong',
        errorBody: 'We could not load glitches. Please try again.',
        retry: 'Retry',
      }
    : {
        title: 'バグの博物館',
        primaryLine: '伝説のゲームバグを投稿して、みんなで投票。気に入った投稿はBase mainnetにハッシュを刻めます。',
        secondaryLine: '本文はオンチェーンに載せず、bytes32の証明だけを残します。',
        steps: ['① 閲覧', '② 投稿', '③ Base mainnetにスタンプ'],
        proofBadge: '投稿の証明ハッシュをBaseに刻印',
        cta: '今すぐバグを投稿',
        headerAction: '投稿する',
        langLabel: '言語',
        langJa: '日本語',
        langEn: 'English',
        featuredTitle: '注目のバグ',
        featuredBadge: 'ピックアップ',
        popularTitle: '人気のバグ',
        popularLoading: '人気のバグを読み込み中',
        loading: '読み込み中',
        searchResult: (query: string) => `「${query}」の検索結果`,
        listHeadingSearch: '検索結果',
        listHeadingLatest: '新着',
        emptyTitle: 'まだ投稿がありません',
        emptySearchTitle: '検索結果がありません',
        emptySearch: (query: string) => `「${query}」に一致する投稿が見つかりませんでした。`,
        emptyFeatured: '他の新着はまだありません。',
        emptyNone: 'まだ投稿がありません。最初の1件を投稿しよう。',
        emptyCtaSubmit: 'バグを投稿する',
        emptyCtaClear: '検索をクリア',
        errorTitle: '読み込みに失敗しました',
        errorBody: '投稿の取得に失敗しました。もう一度お試しください。',
        retry: '再読み込み',
      };

  const createLangUrl = (nextLang: 'ja' | 'en') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (page && page !== '1') params.set('page', page);
    params.set('lang', nextLang);
    return `/?${params.toString()}`;
  };

  const buildUrl = (next: { q?: string | null; page?: string | null; retry?: string } = {}) => {
    const params = new URLSearchParams();
    const nextQuery = next.q !== undefined ? next.q : q;
    const nextPage = next.page !== undefined ? next.page : page;
    if (nextQuery) params.set('q', nextQuery);
    if (nextPage && nextPage !== '1') params.set('page', nextPage);
    if (shouldIncludeLang) params.set('lang', resolvedLang);
    if (next.retry) params.set('retry', next.retry);
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : '/';
  };

  const submitHref = shouldIncludeLang ? `/submit?lang=${resolvedLang}` : '/submit';
  const clearSearchHref = buildUrl({ q: '', page: '1' });
  const retryHref = buildUrl({ retry: Date.now().toString() });

  const displayGlitches =
    !q && currentPage === 1 && featured
      ? glitches.filter((g) => g.id !== featured.id)
      : glitches;

  const hasListError = listError && displayGlitches.length === 0;

  const emptyTitle = q ? copy.emptySearchTitle : copy.emptyTitle;
  const emptyBody = q
    ? copy.emptySearch(q)
    : featured
    ? copy.emptyFeatured
    : copy.emptyNone;

  return (
    <div className="page">
      <MiniKitReady />
      <Header actionText={copy.headerAction} actionHref={submitHref} />
      <main className="page-main">
        <section className="page-intro">
          <h2 className="page-intro__title">{copy.title}</h2>
          <p className="page-intro__desc">{copy.primaryLine}</p>
          <p className="page-intro__desc" style={{ marginTop: 'var(--sp-xs)' }}>
            {copy.secondaryLine}
          </p>
          <div style={{ marginTop: 'var(--sp-xs)', display: 'flex', gap: 'var(--sp-xs)', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem' }}>{copy.langLabel}</span>
            <div className="lang-toggle-group" role="group" aria-label={copy.langLabel}>
              <Link
                href={createLangUrl('en')}
                className="lang-toggle__item"
                aria-current={resolvedLang === 'en' ? 'true' : undefined}
              >
                {copy.langEn}
              </Link>
              <Link
                href={createLangUrl('ja')}
                className="lang-toggle__item"
                aria-current={resolvedLang === 'ja' ? 'true' : undefined}
              >
                {copy.langJa}
              </Link>
            </div>
          </div>
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-xs)', justifyContent: 'center', alignItems: 'center' }}>
            {copy.steps.map((step) => (
              <span key={step} className="tag-badge">
                {step}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-xs)', justifyContent: 'center' }}>
            <span className="tag-badge">{copy.proofBadge}</span>
          </div>
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', justifyContent: 'center' }}>
            <Link
              href={submitHref}
              className="search-bar__button"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '220px' }}
            >
              {copy.cta}
            </Link>
          </div>
        </section>

        {!q && currentPage === 1 && featured && (
          <section style={{ marginBottom: 'var(--sp-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-sm)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--c-text-muted)' }}>{copy.featuredTitle}</h3>
              <span className="tag-badge">{copy.featuredBadge}</span>
            </div>
            <GlitchCard glitch={featured} />
          </section>
        )}

        {!q && currentPage === 1 && (
          <Suspense
            fallback={
              <section className="popular-section">
                <h3 className="popular-section__title">{copy.popularTitle}</h3>
                <div className="popular-section__list popular-section__list--skeleton" aria-label={copy.popularLoading}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="popular-section__item">
                      <div className="skeleton skeleton-line skeleton-line--short" />
                      <div className="skeleton-card">
                        <div className="skeleton skeleton-thumb" />
                        <div className="skeleton-body">
                          <div className="skeleton skeleton-line" />
                          <div className="skeleton skeleton-line skeleton-line--short" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            }
          >
            <PopularGlitches glitches={allGlitches} />
          </Suspense>
        )}

        <Suspense
          fallback={
            <div className="search-skeleton" aria-label={copy.loading}>
              <div className="skeleton search-skeleton__input" />
              <div className="skeleton search-skeleton__button" />
            </div>
          }
        >
          <SearchBar />
        </Suspense>
        {!q && currentPage === 1 && allGlitches.length > 0 && (
          <div style={{ margin: 'var(--sp-xs) 0 var(--sp-md)', display: 'flex', justifyContent: 'center' }}>
            <RandomGlitchButton ids={allGlitches.map((g) => g.id)} />
          </div>
        )}

        {q && (
          <p style={{ color: 'var(--c-text-muted)', marginBottom: 'var(--sp-md)' }}>
            {copy.searchResult(q)}
          </p>
        )}

        {(q || displayGlitches.length > 0 || (!q && currentPage === 1 && !!featured)) && (
          <h3 style={{ margin: '0 0 var(--sp-sm)', fontSize: '1rem', color: 'var(--c-text-muted)' }}>
            {q ? copy.listHeadingSearch : copy.listHeadingLatest}
          </h3>
        )}

        <section className="glitch-list">
          {hasListError ? (
            <div className="empty-state">
              <h4 className="empty-state__title">{copy.errorTitle}</h4>
              <p className="empty-state__copy">{copy.errorBody}</p>
              <div className="empty-state__actions">
                <Link href={retryHref} className="button-secondary">
                  {copy.retry}
                </Link>
              </div>
            </div>
          ) : displayGlitches.length === 0 ? (
            <div className="empty-state">
              <h4 className="empty-state__title">{emptyTitle}</h4>
              <p className="empty-state__copy">{emptyBody}</p>
              <div className="empty-state__actions">
                <Link href={submitHref} className="search-bar__button">
                  {copy.emptyCtaSubmit}
                </Link>
                {q && (
                  <Link href={clearSearchHref} className="button-secondary">
                    {copy.emptyCtaClear}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            displayGlitches.map((glitch) => (
              <GlitchCard key={glitch.id} glitch={glitch} />
            ))
          )}
        </section>

        <Suspense fallback={null}>
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
