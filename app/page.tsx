import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import PopularGlitches from '@/components/PopularGlitches';
import { MiniKitReady } from '@/components/MiniKitReady';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

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
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const [{ glitches, totalPages }, allGlitches] = await Promise.all([
    getGlitches(q, currentPage),
    getAllGlitchesForRanking(),
  ]);

  return (
    <div className="page">
      <MiniKitReady />
      <Header />
      <main className="page-main">
        <section className="page-intro">
          <h2 className="page-intro__title">バグの博物館</h2>
          <p className="page-intro__desc">
            投稿の指紋（bytes32）だけを Base mainnet に刻む。
            <br />内容や動画はオフチェーンのまま。
          </p>
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-xs)', justifyContent: 'center', alignItems: 'center' }}>
            <span className="tag-badge">投稿</span>
            <span style={{ color: 'var(--c-text-muted)' }}>→</span>
            <span className="tag-badge">Stamp</span>
            <span style={{ color: 'var(--c-text-muted)' }}>→</span>
            <span className="tag-badge">basescanで検証/共有</span>
          </div>
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-xs)', justifyContent: 'center' }}>
            <span className="tag-badge">Base mainnet</span>
            <span className="tag-badge">Onchain museum stamp</span>
            <span className="tag-badge">bytes32 only</span>
          </div>
        </section>

        {!q && currentPage === 1 && (
          <Suspense fallback={<div style={{ color: 'var(--c-text-muted)' }}>Loading popular glitches...</div>}>
            <PopularGlitches glitches={allGlitches} />
          </Suspense>
        )}

        <Suspense fallback={<div>Loading...</div>}>
          <SearchBar />
        </Suspense>

        {q && (
          <p style={{ color: 'var(--c-text-muted)', marginBottom: 'var(--sp-md)' }}>
            Results for "{q}"
          </p>
        )}

        <section className="glitch-list">
          {glitches.length === 0 ? (
            <p style={{ color: 'var(--c-text-muted)', textAlign: 'center' }}>
              {q ? `No glitches found for "${q}".` : 'No glitches found. Be the first to submit one!'}
            </p>
          ) : (
            glitches.map((glitch) => (
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
