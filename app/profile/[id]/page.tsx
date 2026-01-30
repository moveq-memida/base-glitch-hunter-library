import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UserCard from '@/components/UserCard';
import BadgeGrid from '@/components/BadgeGrid';
import GlitchCard from '@/components/GlitchCard';
import ProfileClient from './ProfileClient';
import { prisma } from '@/lib/prisma';
import { type UserTier } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    return { title: 'Profile | Glitch Hunter Library' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { display_name: true, wallet_address: true },
  });

  const name = user?.display_name || (user?.wallet_address ? `${user.wallet_address.slice(0, 6)}...` : 'Hunter');

  return {
    title: `${name}'s Profile | Glitch Hunter Library`,
    description: `View ${name}'s glitch discoveries and achievements`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      glitches: {
        orderBy: { created_at: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          game_name: true,
          platform: true,
          tags: true,
          video_url: true,
          stamp_tx_hash: true,
          author_address: true,
          created_at: true,
        },
      },
      user_badges: {
        include: {
          badge: true,
        },
        orderBy: { awarded_at: 'desc' },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const badges = user.user_badges.map((ub) => ({
    id: ub.badge.id,
    code: ub.badge.code,
    name: ub.badge.name_en,
    description: ub.badge.description_en,
    iconUrl: ub.badge.icon_url,
    awardedAt: ub.awarded_at,
  }));

  const userData = {
    id: user.id,
    displayName: user.display_name,
    walletAddress: user.wallet_address,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    tier: user.tier as UserTier,
    reputationPoints: user.reputation_points,
    totalSubmissions: user.total_submissions,
    totalVotesReceived: user.total_votes_received,
    totalStamps: user.total_stamps,
  };

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <Link href="/leaderboard" className="page-back-link">
          Leaderboard
        </Link>

        <UserCard user={userData} showProgress />

        <ProfileClient
          userId={user.id}
          displayName={user.display_name}
          bio={user.bio}
          avatarUrl={user.avatar_url}
          walletAddress={user.wallet_address}
        />

        <section className="profile-section">
          <h3 className="profile-section__title">Badges</h3>
          <BadgeGrid badges={badges} />
        </section>

        <section className="profile-section">
          <h3 className="profile-section__title">Recent Glitches</h3>
          {user.glitches.length > 0 ? (
            <div className="glitch-list">
              {user.glitches.map((glitch) => (
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
                  compact
                />
              ))}
            </div>
          ) : (
            <p className="profile-section__empty">No glitches submitted yet.</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
