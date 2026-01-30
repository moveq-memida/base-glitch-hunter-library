import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Games | Glitch Hunter Library',
  description: 'Browse games with discovered glitches',
};

interface GamesPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const { q } = await searchParams;

  const gamesWithCounts = await prisma.glitch.groupBy({
    by: ['game_name'],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    ...(q
      ? {
          where: {
            game_name: {
              contains: q,
              mode: 'insensitive',
            },
          },
        }
      : {}),
  });

  const games = gamesWithCounts.map((g) => ({
    name: g.game_name,
    count: g._count.id,
    slug: encodeURIComponent(g.game_name),
  }));

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/" className="page-back-link">
          Back to home
        </Link>

        <h1 className="page-title">Games</h1>
        <p className="page-subtitle">Browse games with discovered glitches</p>

        <form method="get" style={{ marginBottom: '1.5rem' }}>
          <div className="search-bar">
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search games..."
              className="search-bar__input"
            />
            <button type="submit" className="search-bar__button">
              Search
            </button>
          </div>
        </form>

        {games.length > 0 ? (
          <div className="glitch-list">
            {games.map((game) => (
              <Link
                key={game.name}
                href={`/games/${game.slug}`}
                className="glitch-card"
                style={{ padding: '1rem' }}
              >
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700 }}>
                  {game.name}
                </h3>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                  {game.count} glitch{game.count === 1 ? '' : 'es'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__copy">No games found.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
