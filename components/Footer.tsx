import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="page-footer">
      <p>© 2025 Glitch Hunter Library. Built for game preservation.</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <a href="https://github.com/moveq-memida/base-glitch-hunter-library" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <Link href="/terms">Terms</Link>
      </div>
    </footer>
  );
}
