'use client';

import Link from 'next/link';

export default function Footer() {
  const navItems = [
    { label: 'GAMES', href: '/games' },
    { label: 'RANKINGS', href: '/leaderboard' },
    { label: 'CONTESTS', href: '/contests' },
    { label: 'STATS', href: '/analytics' },
    { label: 'SUBMIT', href: '/submit' },
  ];

  return (
    <footer className="page-footer">
      <nav className="page-footer__nav">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href}>[{item.label}]</Link>
        ))}
      </nav>

      <p style={{ color: 'var(--accent-green)', marginBottom: '0.75rem' }}>
        {'>'} SYSTEM STATUS: ONLINE
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer">
          [GITHUB]
        </a>
        <a href="https://basescan.org" target="_blank" rel="noopener noreferrer">
          [BASESCAN]
        </a>
        <Link href="/terms">[TERMS]</Link>
      </div>

      <p>(C) 2025 GLITCH_HUNTER_LIB</p>
    </footer>
  );
}
