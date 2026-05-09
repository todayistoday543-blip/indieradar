import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ClientLayout } from '@/components/client-layout';

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com').trim();

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  title: {
    default: 'IndieRadar — Real Indie Hacker Revenue Cases. No Gurus. No Affiliates.',
    template: '%s | IndieRadar',
  },
  description:
    'Verified indie hacker revenue case studies — no gurus, no affiliate links, no info products. Real MRR from Hacker News, Product Hunt & Reddit, AI-curated daily in 9 languages. Filter by business model, difficulty, and revenue range.',
  keywords: [
    'indie hacker',
    'monetization',
    'SaaS',
    'MRR',
    'ARR',
    'side project',
    'bootstrapped',
    'startup revenue',
    'Hacker News',
    'Product Hunt',
    'Reddit',
    'Indie Hackers',
    'IndieRadar',
    'case study',
    'インディーハッカー',
    'マネタイズ',
    'サイドプロジェクト',
    'スタートアップ',
    '収益化',
    'monetización',
    'proyecto independiente',
  ],
  authors: [{ name: 'IndieRadar' }],
  creator: 'IndieRadar',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'IndieRadar',
    title: 'IndieRadar — Real Indie Hacker Revenue Cases. No Gurus. No Affiliates.',
    description:
      'Verified indie hacker revenue case studies — no gurus, no affiliate links, no info products. Real MRR from Hacker News, Product Hunt & Reddit, AI-curated daily in 9 languages.',
    images: [
      {
        url: `${APP_URL}/api/og?title=${encodeURIComponent('IndieRadar — Indie Hacker Monetization Case Studies')}`,
        width: 1200,
        height: 630,
        alt: 'IndieRadar — Indie Hacker Monetization Case Studies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndieRadar',
    description:
      'AI-curated monetization case studies from indie hackers worldwide.',
    images: [`${APP_URL}/api/og?title=${encodeURIComponent('IndieRadar — Indie Hacker Monetization Case Studies')}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  // hreflang: same URL serves all 9 languages via client-side locale switching
  alternates: {
    canonical: APP_URL,
    languages: {
      'en': APP_URL,
      'ja': APP_URL,
      'es': APP_URL,
      'ko': APP_URL,
      'zh': APP_URL,
      'hi': APP_URL,
      'de': APP_URL,
      'fr': APP_URL,
      'pt': APP_URL,
      'x-default': APP_URL,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0B0C',
};

// Inline script to prevent flash of wrong theme on load
const themeScript = `(function(){try{var t=localStorage.getItem('ir-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light')}else if(!t&&window.matchMedia('(prefers-color-scheme:light)').matches){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`;

// WebSite JSON-LD for sitelinks searchbox and entity recognition
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'IndieRadar',
  url: APP_URL,
  description: 'Verified indie hacker revenue case studies. No gurus, no affiliates, no info products. Real MRR from Hacker News, Product Hunt & Reddit, AI-curated daily.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${APP_URL}/articles?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// Organization JSON-LD — helps Google associate the brand entity with the homepage
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'IndieRadar',
  url: APP_URL,
  logo: `${APP_URL}/icon.png`,
  description: 'AI-powered curation of verified indie hacker revenue case studies. No gurus, no affiliates, no info products.',
  sameAs: [],
};

// FAQPage JSON-LD — enables rich snippets and occupies more SERP space
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is IndieRadar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'IndieRadar is an AI-curated platform that collects verified indie hacker revenue case studies daily from Hacker News, Product Hunt, Reddit, and X. No gurus, no affiliate links, no info products — only real monetization data.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does IndieRadar work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'IndieRadar automatically scans Hacker News, Product Hunt, Reddit, and X for posts containing real revenue data (MRR, ARR). AI translates and summarizes each case into 9 languages with actionable insights.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is IndieRadar free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, IndieRadar offers a free tier with unlimited article previews. Paid plans (Basic and Pro) unlock full translations, AI insights, and implementation guides.',
      },
    },
    {
      '@type': 'Question',
      name: 'What languages does IndieRadar support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'IndieRadar supports 9 languages: English, Japanese, Spanish, Korean, Chinese, Hindi, German, French, and Portuguese. All content is AI-translated with localized action points.',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
<script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
