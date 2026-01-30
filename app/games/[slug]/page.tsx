import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import Pagination from '@/components/Pagination';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

interface GamePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const gameName = decodeURIComponent(slug);

  return {
    title: `${gameName} Glitches | Glitch Hunter Library`,
    description: `Discover glitches for ${gameName}`,
  };
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { slug } = await params;
  const { page } = await searchParams;
  const gameName = decodeURIComponent(slug);
  const currentPage = Math.max(1, parseInt(page || '1', 10));

  const skip = (currentPage - 1) * PAGE_SIZE;

  const [glitches, total] = await Promise.all([
    prisma.glitch.findMany({
      where: {
        game_name: {
          equals: gameName,
          mode: 'insensitive',
        },
      },
      orderBy: { created_at: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.glitch.count({
      where: {
        game_name: {
          equals: gameName,
          mode: 'insensitive',
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/games" className="page-back-link">
          All games
        </Link>

        <h1 className="page-title">{gameName}</h1>
        <p className="page-subtitle">
          {total} glitch{total === 1 ? '' : 'es'} discovered
        </p>

        <div className="game-page__actions">
          <Link href={`/leaderboard/${encodeURIComponent(gameName)}`} className="btn btn--secondary">
            View leaderboard
          </Link>
        </div>

        {glitches.length > 0 ? (
          <section className="glitch-list">
            {glitches.map((glitch) => (
              <GlitchCard
                key={glitch.id}
                glitch={{
                  id: glitch.id,
                  title: glitch.title,
                  game_name: glitch.game_name,
                  platform: glitch.platform,
                  tags: glitch.tags,
                  video_url: glitch.video_url,
                  stamp_tx_hash: glitch.stamp_tx_hash,
                  author_address: glitch.author_address,
                  created_at: glitch.created_at,
                }}
              />
            ))}
          </section>
        ) : (
          <div className="empty-state">
            <p className="empty-state__copy">No glitches found for this game.</p>
            <Link href="/submit" className="btn btn--primary">
              Submit the first glitch!
            </Link>
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </main>
      <Footer />
    </div>
  );
}
