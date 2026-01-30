import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ContestPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ContestPageProps): Promise<Metadata> {
  const { id } = await params;
  const contestId = parseInt(id, 10);

  if (isNaN(contestId)) {
    return { title: 'Contest | Glitch Hunter Library' };
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { title: true },
  });

  return {
    title: `${contest?.title || 'Contest'} | Glitch Hunter Library`,
    description: 'Join this glitch hunting contest',
  };
}

export default async function ContestPage({ params }: ContestPageProps) {
  const { id } = await params;
  const contestId = parseInt(id, 10);

  if (isNaN(contestId)) {
    notFound();
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      entries: {
        include: {
          glitch: true,
          user: {
            select: {
              id: true,
              display_name: true,
              wallet_address: true,
            },
          },
        },
        orderBy: { submitted_at: 'desc' },
      },
    },
  });

  if (!contest) {
    notFound();
  }

  const now = new Date();
  const isActive = contest.status === 'ACTIVE' && contest.end_date > now;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/contests" className="page-back-link">
          All contests
        </Link>

        <div className="contest-detail__status-row">
          <span className={`contest-card__status ${isActive ? 'contest-card__status--active' : 'contest-card__status--ended'}`}>
            {isActive ? 'Active' : 'Ended'}
          </span>
        </div>

        <h1 className="page-title">{contest.title}</h1>

        <p className="contest-detail__description">
          {contest.description}
        </p>

        <div className="contest-detail__info">
          <div className="contest-detail__info-item">
            <div className="contest-detail__info-label">Start Date</div>
            <div className="contest-detail__info-value">{formatDate(contest.start_date)}</div>
          </div>
          <div className="contest-detail__info-item">
            <div className="contest-detail__info-label">End Date</div>
            <div className="contest-detail__info-value">{formatDate(contest.end_date)}</div>
          </div>
          {contest.game_filter && (
            <div className="contest-detail__info-item">
              <div className="contest-detail__info-label">Game</div>
              <div className="contest-detail__info-value">{contest.game_filter}</div>
            </div>
          )}
          {contest.prize_description && (
            <div className="contest-detail__info-item contest-detail__info-item--full">
              <div className="contest-detail__info-label">Prizes</div>
              <div className="contest-detail__info-value">{contest.prize_description}</div>
            </div>
          )}
        </div>

        <h2 className="contest-detail__entries-title">
          Entries ({contest.entries.length})
        </h2>

        {contest.entries.length > 0 ? (
          <div className="glitch-list">
            {contest.entries.map((entry) => (
              <GlitchCard
                key={entry.id}
                glitch={{
                  id: entry.glitch.id,
                  title: entry.glitch.title,
                  game_name: entry.glitch.game_name,
                  platform: entry.glitch.platform,
                  tags: entry.glitch.tags,
                  video_url: entry.glitch.video_url,
                  stamp_tx_hash: entry.glitch.stamp_tx_hash,
                  author_address: entry.glitch.author_address,
                  created_at: entry.glitch.created_at,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__copy">No entries yet. Be the first to submit!</p>
            {isActive && (
              <Link href="/submit" className="btn btn--primary">
                Submit a glitch
              </Link>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
