import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com';

export const metadata: Metadata = {
  title: 'Market Dashboard',
  description:
    'Real-time indie hacker revenue statistics. MRR distribution, top earners, average revenue by source and difficulty — aggregated from thousands of case studies.',
  keywords: [
    'indie hacker revenue',
    'MRR statistics',
    'startup revenue data',
    'SaaS metrics',
    'indie hacker dashboard',
    'マーケットデータ',
    'インディーハッカー統計',
  ],
  openGraph: {
    title: 'Market Dashboard | IndieRadar',
    description:
      'Live MRR distribution, top earners, and revenue breakdowns from thousands of indie hacker case studies.',
    url: `${APP_URL}/dashboard`,
    type: 'website',
    siteName: 'IndieRadar',
    images: [
      {
        url: `${APP_URL}/api/og?title=${encodeURIComponent('Indie Hacker Market Dashboard — IndieRadar')}`,
        width: 1200,
        height: 630,
        alt: 'IndieRadar Market Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Dashboard | IndieRadar',
    description: 'Live MRR data and revenue breakdowns from thousands of indie hacker case studies.',
    images: [`${APP_URL}/api/og?title=${encodeURIComponent('Indie Hacker Market Dashboard — IndieRadar')}`],
  },
  alternates: {
    canonical: `${APP_URL}/dashboard`,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
