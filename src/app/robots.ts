import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/settings',
          '/bookmarks',
        ],
      },
      {
        // Allow Googlebot full access to article pages for indexing
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/auth/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
