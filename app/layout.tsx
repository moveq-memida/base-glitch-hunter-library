import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Glitch Hunter Library',
  description: 'A library collecting bugs, exploits, and odd behaviors hidden in games worldwide.',
  other: {
    'base:app_id': '693b320ce6be54f5ed71d6a6',
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
