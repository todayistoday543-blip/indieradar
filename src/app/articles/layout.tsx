import type { Metadata } from 'next';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com').trim();

export const metadata: Metadata = {
  title: 'Real Monetization Cases — No Gurus, No Affiliates',
  description:
    'Browse verified indie hacker revenue case studies. No gurus, no affiliate links, no info products. Real MRR sourced from Hacker News, Product Hunt & Reddit — AI-curated daily. Filter by SaaS, MRR range, business model, and difficulty.',
  openGraph: {
    title: 'Real Indie Hacker Revenue Cases | IndieRadar',
    description:
      'Verified revenue case studies — no gurus, no affiliates, no info products. Real MRR from HN, PH & Reddit, AI-curated daily in 9 languages.',
    url: `${APP_URL}/articles`,
    type: 'website',
    siteName: 'IndieRadar',
    images: [
      {
        url: `${APP_URL}/api/og?title=${encodeURIComponent('Indie Hacker Monetization Articles — IndieRadar')}`,
        width: 1200,
        height: 630,
        alt: 'IndieRadar Articles',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indie Hacker Monetization Articles | IndieRadar',
    description: 'Daily case studies from HN, PH, Reddit & X — AI-translated into 9 languages.',
    images: [`${APP_URL}/api/og?title=${encodeURIComponent('Indie Hacker Monetization Articles — IndieRadar')}`],
  },
  alternates: {
    canonical: `${APP_URL}/articles`,
  },
};

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
