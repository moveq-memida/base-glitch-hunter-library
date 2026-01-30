import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LeaderboardTable from '@/components/LeaderboardTable';
import { getLeaderboard } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leaderboard | Glitch Hunter Library',
  description: 'Top glitch hunters ranked by reputation points',
};

export default async function LeaderboardPage() {
  const entries = await getLeaderboard(50, 0);

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/" className="page-back-link">
          Back to home
        </Link>

        <h1 className="page-title">Leaderboard</h1>
        <p className="page-subtitle">Top glitch hunters by reputation</p>

        {entries.length > 0 ? (
          <LeaderboardTable entries={entries} showPoints showGlitchCount={false} />
        ) : (
          <div className="empty-state">
            <p className="empty-state__copy">No hunters yet. Be the first to submit a glitch!</p>
            <Link href="/submit" className="button-primary">
              Submit
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
