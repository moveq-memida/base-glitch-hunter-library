'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function Footer() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const fallbackLang = envLang === 'en' || envLang === 'ja' ? envLang : '';
  const lang = (langParam === 'en' || langParam === 'ja' ? langParam : fallbackLang) || 'ja';
  const isEnglish = lang === 'en';
  const shouldIncludeLang = Boolean(langParam || fallbackLang);
  const termsHref = shouldIncludeLang ? `/terms?lang=${lang}` : '/terms';

  const copy = isEnglish
    ? {
        description: '© 2025 Glitch Hunter Library — Glitch archive (Base Mini App)',
        terms: 'Terms',
      }
    : {
        description: '© 2025 Glitch Hunter Library — バグの博物館（Base Mini App）',
        terms: '利用規約',
      };

  return (
    <footer className="page-footer">
      <p>{copy.description}</p>
      <div className="page-footer__links">
        <a href="https://github.com/moveq-memida/base-glitch-hunter-library" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <Link href={termsHref}>{copy.terms}</Link>
      </div>
      <a
        className="page-footer__badge"
        href="https://orynth.dev/projects/glitch-hunter-library-9464"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          className="page-footer__badge-img"
          src="https://orynth.dev/api/badge/glitch-hunter-library-9464?theme=dark&style=minimal"
          alt="Featured on Orynth"
          width="180"
          height="48"
        />
      </a>
    </footer>
  );
}
