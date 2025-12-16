import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import PopularGlitches from '@/components/PopularGlitches';
import { MiniKitReady } from '@/components/MiniKitReady';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import RandomGlitchButton from '@/components/RandomGlitchButton';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

async function getAllGlitchesForRanking() {
  try {
    const glitches = await prisma.glitch.findMany({
      select: {
        id: true,
        title: true,
        game_name: true,
        platform: true,
        tags: true,
        video_url: true,
        onchain_glitch_id: true,
      },
    });
    return glitches;
  } catch (error) {
    console.error('Error fetching glitches for ranking:', error);
    return [];
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
    };
  } catch (error) {
    console.error('Error fetching glitches:', error);
    return { glitches: [], totalPages: 0 };
  }
}

interface HomePageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const acceptLanguage = (await headers()).get('accept-language') || '';
  const prefersJa = !acceptLanguage || acceptLanguage.toLowerCase().includes('ja');
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const [{ glitches, totalPages }, allGlitches] = await Promise.all([
    getGlitches(q, currentPage),
    getAllGlitchesForRanking(),
  ]);

  const primaryLine = prefersJa
    ? '伝説のゲームバグを投稿して、みんなで投票。気に入った投稿はBaseに“刻める”。'
    : 'Post legendary game glitches, upvote, and stamp them on Base.';

  const secondaryLine = prefersJa
    ? 'Post legendary game glitches, upvote, and stamp them on Base.'
    : '伝説のゲームバグを投稿して、みんなで投票。気に入った投稿はBaseに“刻める”。';

  const featured =
    !q && currentPage === 1
      ? glitches.find((g) => `${g.title} ${g.game_name}`.includes('なぞのばしょ')) || glitches[0]
      : null;

  const displayGlitches =
    !q && currentPage === 1 && featured
      ? glitches.filter((g) => g.id !== featured.id)
      : glitches;

  return (
    <div className="page">
      <MiniKitReady />
      <Header />
      <main className="page-main">
        <section className="page-intro">
          <h2 className="page-intro__title">バグの博物館</h2>
          <p className="page-intro__desc">
            {primaryLine}
            <br />
            <span style={{ fontSize: '0.875rem' }}>{secondaryLine}</span>
          </p>
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-xs)', justifyContent: 'center', alignItems: 'center' }}>
            <span className="tag-badge">① Browse</span>
            <span className="tag-badge">② Post</span>
            <span className="tag-badge">③ Stamp on Base</span>
          </div>
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-xs)', justifyContent: 'center' }}>
            <span className="tag-badge">Base mainnet</span>
            <span className="tag-badge">博物館スタンプ</span>
            <span className="tag-badge">bytes32だけ</span>
          </div>
          {!q && currentPage === 1 && allGlitches.length > 0 && (
            <div style={{ marginTop: 'var(--sp-sm)' }}>
              <RandomGlitchButton ids={allGlitches.map((g) => g.id)} />
            </div>
          )}
        </section>

        {!q && currentPage === 1 && featured && (
          <section style={{ marginBottom: 'var(--sp-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-sm)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--c-text-muted)' }}>ピックアップ</h3>
              <span className="tag-badge">注目</span>
            </div>
            <GlitchCard glitch={featured} />
          </section>
        )}

        {!q && currentPage === 1 && (
          <Suspense fallback={<div style={{ color: 'var(--c-text-muted)' }}>人気のバグを読み込み中...</div>}>
            <PopularGlitches glitches={allGlitches} />
          </Suspense>
        )}

        <Suspense fallback={<div>読み込み中...</div>}>
          <SearchBar />
        </Suspense>

        {q && (
          <p style={{ color: 'var(--c-text-muted)', marginBottom: 'var(--sp-md)' }}>
            「{q}」の検索結果
          </p>
        )}

        {(q || displayGlitches.length > 0 || (!q && currentPage === 1 && !!featured)) && (
          <h3 style={{ margin: '0 0 var(--sp-sm)', fontSize: '1rem', color: 'var(--c-text-muted)' }}>
            {q ? '検索結果' : '新着'}
          </h3>
        )}

        <section className="glitch-list">
          {displayGlitches.length === 0 ? (
            <p style={{ color: 'var(--c-text-muted)', textAlign: 'center' }}>
              {q
                ? `「${q}」に一致する投稿が見つかりませんでした。`
                : featured
                ? '他の新着はまだありません。'
                : 'まだ投稿がありません。最初の1件を投稿しよう。'}
            </p>
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
