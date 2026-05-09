import type { Metadata } from 'next';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com').trim();

export const metadata: Metadata = {
  title: 'Submit a Case Study',
  description:
    'Submit your indie hacker monetization story to IndieRadar. Share how you built and grew your product, MRR milestones, and business model insights with the global community.',
  keywords: [
    'submit indie hacker story',
    'share MRR',
    'indie hacker case study submission',
    'share your startup',
    '事例を投稿',
    'マネタイズ事例を共有',
  ],
  openGraph: {
    title: 'Submit a Case Study | IndieRadar',
    description:
      'Share your indie hacker monetization story with a global community. Submit your MRR milestone, business model, and growth journey.',
    url: `${APP_URL}/submit`,
    type: 'website',
    siteName: 'IndieRadar',
    images: [
      {
        url: `${APP_URL}/api/og?title=${encodeURIComponent('Submit Your Story — IndieRadar')}`,
        width: 1200,
        height: 630,
        alt: 'Submit to IndieRadar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Submit a Case Study | IndieRadar',
    description: 'Share your indie hacker monetization story with the global community.',
    images: [`${APP_URL}/api/og?title=${encodeURIComponent('Submit Your Story — IndieRadar')}`],
  },
  alternates: {
    canonical: `${APP_URL}/submit`,
  },
};

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
