import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://base-glitch-hunter-library.vercel.app';
const host = new URL(appUrl).host;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host,
  };
}
