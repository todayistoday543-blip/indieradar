import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradar.jp';

export const metadata: Metadata = {
  title: 'Articles',
  description:
    'Browse indie hacker monetization case studies. AI-curated daily from Hacker News, Product Hunt, Reddit, and X. Filter by SaaS, MRR, business model, and more.',
  openGraph: {
    title: 'Indie Hacker Monetization Articles | IndieRadar',
    description:
      'Daily indie hacker case studies curated from HN, Product Hunt, Reddit & X — AI-translated into 9 languages.',
    url: `${APP_URL}/articles`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indie Hacker Monetization Articles | IndieRadar',
    description: 'Daily case studies from HN, PH, Reddit & X — AI-translated into 9 languages.',
  },
  alternates: {
    canonical: `${APP_URL}/articles`,
  },
};

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
