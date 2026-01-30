import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LeaderboardTable from '@/components/LeaderboardTable';
import { getGameLeaderboard } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

interface GameLeaderboardPageProps {
  params: Promise<{ game: string }>;
}

export async function generateMetadata({ params }: GameLeaderboardPageProps): Promise<Metadata> {
  const { game } = await params;
  const gameName = decodeURIComponent(game);

  return {
    title: `${gameName} Leaderboard | Glitch Hunter Library`,
    description: `Top glitch hunters for ${gameName}`,
  };
}

export default async function GameLeaderboardPage({ params }: GameLeaderboardPageProps) {
  const { game } = await params;
  const gameName = decodeURIComponent(game);

  const entries = await getGameLeaderboard(gameName, 50, 0);

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/leaderboard" className="page-back-link">
          All rankings
        </Link>

        <h1 className="page-title">{gameName} Leaderboard</h1>
        <p className="page-subtitle">Top hunters for {gameName}</p>

        {entries.length > 0 ? (
          <LeaderboardTable entries={entries} showPoints={false} showGlitchCount />
        ) : (
          <div className="empty-state">
            <p className="empty-state__copy">No hunters for this game yet.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
