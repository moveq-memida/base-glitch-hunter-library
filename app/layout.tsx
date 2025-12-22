import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from '@/components/Providers';

const appUrl = 'https://base-glitch-hunter-library.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Glitch Hunter Library',
    template: '%s | Glitch Hunter Library',
  },
  description: 'Post, vote, and stamp legendary game glitches with a hash proof on Base mainnet.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/icon.png', type: 'image/png' }],
    shortcut: ['/icon.png'],
  },
  openGraph: {
    title: 'Glitch Hunter Library',
    description: 'Post, vote, and stamp legendary game glitches with a hash proof on Base mainnet.',
    url: appUrl,
    siteName: 'Glitch Hunter Library',
    images: [
      {
        url: `${appUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: 'Glitch Hunter Library',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Glitch Hunter Library',
    description: 'Post, vote, and stamp legendary game glitches with a hash proof on Base mainnet.',
    images: [`${appUrl}/og.png`],
  },
  verification: {
    google: '-OYHm4HHiEAQivWnfq5fF1Shm_Lks1Do7JyNgbMsNV8',
  },
  other: {
    'base:app_id': '693b320ce6be54f5ed71d6a6',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: `${appUrl}/og.png`,
      button: {
        title: 'Launch Glitch Hunter',
        action: {
          type: 'launch_miniapp',
          name: 'Glitch Hunter Library',
          url: appUrl,
          splashImageUrl: `${appUrl}/splash.png`,
          splashBackgroundColor: '#121212',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-MVRPXCL3EN" />
        <Script id="ga-setup" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MVRPXCL3EN');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
