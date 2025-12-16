import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="page-footer">
      <p>© 2025 Glitch Hunter Library — バグの博物館（Base Mini App）</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <a href="https://github.com/moveq-memida/base-glitch-hunter-library" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <Link href="/terms">利用規約</Link>
      </div>
    </footer>
  );
}
