import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlitchCard from '@/components/GlitchCard';

interface Glitch {
  id: string | number;
  title: string;
  game_name: string;
  platform: string;
  video_url: string;
  description: string;
  tags: string;
  author_address: string;
  onchain_glitch_id: number;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

async function getGlitches(): Promise<Glitch[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/glitches?limit=20`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch glitches');
      return [];
    }

    return await res.json();
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
