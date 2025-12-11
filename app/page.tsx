import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';

async function getGlitches() {
  try {
    const glitches = await prisma.glitch.findMany({
      take: 20,
      orderBy: {
        created_at: 'desc',
      },
    });
    return glitches;
  } catch (error) {
    console.error('Error fetching glitches:', error);
    return [];
  }
}

export default async function HomePage() {
  const glitches = await getGlitches();

  return (
    <div className="page">
      <Header />
      <main className="page-main">
        <section className="page-intro">
          <h2 className="page-intro__title">Archive the Broken</h2>
          <p className="page-intro__desc">
            A library collecting bugs, exploits, and odd behaviors hidden in games worldwide.
            <br />
            Record the "Glitch" you discovered.
          </p>
        </section>

        <section className="glitch-list">
          {glitches.length === 0 ? (
            <p style={{ color: 'var(--c-text-muted)', textAlign: 'center' }}>
              No glitches found. Be the first to submit one!
            </p>
          ) : (
            glitches.map((glitch) => (
              <GlitchCard key={glitch.id} glitch={glitch} />
            ))
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
