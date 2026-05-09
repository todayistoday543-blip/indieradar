import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradar.jp';

export const metadata: Metadata = {
  title: 'Plans & Pricing',
  robots: {
    index: false,   // Keep pricing out of Google — homepage/articles should be the entry point
    follow: true,
  },
  description:
    'IndieRadar plans for indie hackers. Free, Basic, and Pro tiers — unlock full monetization case studies, AI-generated business guides, and country-specific market insights.',
  keywords: [
    'IndieRadar pricing',
    'indie hacker subscription',
    'SaaS case study access',
    'MRR insights',
    'business model research',
    '料金プラン',
    'インディーハッカー',
  ],
  openGraph: {
    title: 'Pricing | IndieRadar',
    description:
      'Unlock full indie hacker case studies, AI business guides, and country-specific insights. Plans starting free.',
    url: `${APP_URL}/pricing`,
    type: 'website',
    siteName: 'IndieRadar',
    images: [
      {
        url: `${APP_URL}/api/og?title=${encodeURIComponent('IndieRadar Pricing — Unlock Full Monetization Insights')}`,
        width: 1200,
        height: 630,
        alt: 'IndieRadar Pricing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | IndieRadar',
    description: 'Unlock full indie hacker case studies and AI business guides. Plans starting free.',
    images: [`${APP_URL}/api/og?title=${encodeURIComponent('IndieRadar Pricing — Unlock Full Monetization Insights')}`],
  },
  alternates: {
    canonical: `${APP_URL}/pricing`,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
