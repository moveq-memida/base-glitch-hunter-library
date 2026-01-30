import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contests | Glitch Hunter Library',
  description: 'Join glitch hunting contests and win prizes',
};

export default async function ContestsPage() {
  const now = new Date();

  const contests = await prisma.contest.findMany({
    where: {
      status: { in: ['ACTIVE', 'ENDED'] },
    },
    orderBy: [
      { status: 'asc' },
      { end_date: 'asc' },
    ],
    include: {
      _count: {
        select: { entries: true },
      },
    },
  });

  const getStatusBadge = (contest: { status: string; start_date: Date; end_date: Date }) => {
    if (contest.status === 'ACTIVE' && contest.end_date > now) {
      return { class: 'contest-card__status--active', label: 'Active' };
    }
    if (contest.status === 'ENDED' || contest.end_date <= now) {
      return { class: 'contest-card__status--ended', label: 'Ended' };
    }
    return { class: 'contest-card__status--draft', label: 'Upcoming' };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/" className="page-back-link">
          Back to home
        </Link>

        <h1 className="page-title">Contests</h1>
        <p className="page-subtitle">Join glitch hunting contests and win prizes</p>

        {contests.length > 0 ? (
          <div className="glitch-list">
            {contests.map((contest) => {
              const status = getStatusBadge(contest);
              return (
                <Link
                  key={contest.id}
                  href={`/contests/${contest.id}`}
                  className="contest-card"
                >
                  <span className={`contest-card__status ${status.class}`}>
                    {status.label}
                  </span>
                  <h3 className="contest-card__title">{contest.title}</h3>
                  <p className="contest-card__desc">
                    {contest.description.slice(0, 100)}
                    {contest.description.length > 100 ? '...' : ''}
                  </p>
                  <div className="contest-card__dates">
                    <span>Ends: {formatDate(contest.end_date)}</span>
                    <span className="contest-card__entries">
                      {contest._count.entries} entr{contest._count.entries === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__copy">No contests available right now.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
