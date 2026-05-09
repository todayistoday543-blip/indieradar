import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com';

export const metadata: Metadata = {
  title: 'Weekly Signal Digest',
  description:
    'Top indie hacker monetization stories of the week. AI-ranked by MRR, views, and engagement — updated every Monday from Hacker News, Product Hunt, Reddit, and Indie Hackers.',
  keywords: [
    'weekly digest',
    'indie hacker weekly',
    'top MRR',
    'best side projects',
    'weekly startup stories',
    'ウィークリーダイジェスト',
    'インディーハッカー週刊',
  ],
  openGraph: {
    title: 'Weekly Signal Digest | IndieRadar',
    description:
      'Top indie hacker monetization stories of the week — AI-ranked by MRR, views, and community engagement.',
    url: `${APP_URL}/weekly`,
    type: 'website',
    siteName: 'IndieRadar',
    images: [
      {
        url: `${APP_URL}/api/og?title=${encodeURIComponent('Weekly Signal Digest — IndieRadar')}`,
        width: 1200,
        height: 630,
        alt: 'Weekly Signal Digest — IndieRadar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weekly Signal Digest | IndieRadar',
    description: 'Top indie hacker stories of the week — ranked by MRR & engagement.',
    images: [`${APP_URL}/api/og?title=${encodeURIComponent('Weekly Signal Digest — IndieRadar')}`],
  },
  alternates: {
    canonical: `${APP_URL}/weekly`,
  },
};

export default function WeeklyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
