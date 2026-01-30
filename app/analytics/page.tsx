import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics | Glitch Hunter Library',
  description: 'Platform statistics and insights',
};

export default async function AnalyticsPage() {
  const [
    totalGlitches,
    totalUsers,
    stampedCount,
    totalVotes,
    topGames,
    recentGlitches,
  ] = await Promise.all([
    prisma.glitch.count(),
    prisma.user.count(),
    prisma.glitch.count({ where: { stamp_tx_hash: { not: null } } }),
    prisma.vote.count(),
    prisma.glitch.groupBy({
      by: ['game_name'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.glitch.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        game_name: true,
        created_at: true,
        stamp_tx_hash: true,
      },
    }),
  ]);

  const stampRate = totalGlitches > 0 ? Math.round((stampedCount / totalGlitches) * 100) : 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/" className="page-back-link">
          Back to home
        </Link>

        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Platform statistics and insights</p>

        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="analytics-card__value">{totalGlitches.toLocaleString()}</div>
            <div className="analytics-card__label">Total Glitches</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-card__value">{totalUsers.toLocaleString()}</div>
            <div className="analytics-card__label">Total Hunters</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-card__value">{stampedCount.toLocaleString()}</div>
            <div className="analytics-card__label">Stamped Glitches</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-card__value">{stampRate}%</div>
            <div className="analytics-card__label">Stamp Rate</div>
          </div>
        </div>

        <section className="analytics-section">
          <h2 className="analytics-section__title">Top Games</h2>
          <div className="analytics-list">
            {topGames.map((game, index) => (
              <Link
                key={game.game_name}
                href={`/games/${encodeURIComponent(game.game_name)}`}
                className="analytics-list__item"
              >
                <div className="analytics-list__left">
                  <span className={`analytics-list__rank ${index < 3 ? 'analytics-list__rank--top' : ''}`}>
                    {index + 1}
                  </span>
                  <span className="analytics-list__name">{game.game_name}</span>
                </div>
                <span className="analytics-list__count">
                  {game._count.id} glitch{game._count.id === 1 ? '' : 'es'}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="analytics-section">
          <h2 className="analytics-section__title">Recent Activity</h2>
          <div className="analytics-list">
            {recentGlitches.map((glitch) => (
              <Link
                key={glitch.id}
                href={`/glitch/${glitch.id}`}
                className="analytics-list__item"
              >
                <div className="analytics-list__left">
                  <div>
                    <div className="analytics-list__name">{glitch.title}</div>
                    <div className="analytics-list__sub">{glitch.game_name}</div>
                  </div>
                </div>
                <div className="analytics-list__right">
                  <div className="analytics-list__date">{formatDate(glitch.created_at)}</div>
                  {glitch.stamp_tx_hash && (
                    <span className="analytics-list__stamp">Stamped</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
