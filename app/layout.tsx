import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

const appUrl = 'https://base-glitch-hunter-library.vercel.app';

export const metadata: Metadata = {
  title: 'Glitch Hunter Library',
  description: 'A library collecting bugs, exploits, and odd behaviors hidden in games worldwide.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/icon.png', type: 'image/png' }],
    shortcut: ['/icon.png'],
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
