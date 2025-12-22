import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Submit a glitch',
  description: 'Share a glitch and leave a hash proof on Base mainnet.',
  alternates: {
    canonical: '/submit',
  },
};

export default function SubmitLayout({ children }: { children: ReactNode }) {
  return children;
}
