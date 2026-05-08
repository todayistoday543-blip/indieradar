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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradar.jp';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  title: {
    default: 'IndieRadar — Indie Hacker Monetization Case Studies',
    template: '%s | IndieRadar',
  },
  description:
    'AI-curated monetization case studies from indie hackers worldwide. Updated daily from Hacker News, Product Hunt, Reddit, and X. Available in 9 languages.',
  keywords: [
    'indie hacker',
    'monetization',
    'SaaS',
    'MRR',
    'side project',
    'bootstrapped',
    'Hacker News',
    'Product Hunt',
    'IndieRadar',
    'インディーハッカー',
    'マネタイズ',
  ],
  authors: [{ name: 'IndieRadar' }],
  creator: 'IndieRadar',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'IndieRadar',
    title: 'IndieRadar — Indie Hacker Monetization Case Studies',
    description:
      'AI-curated monetization case studies from indie hackers worldwide. Updated daily, available in 9 languages.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndieRadar',
    description:
      'AI-curated monetization case studies from indie hackers worldwide.',
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
  // hreflang: same URL serves all languages via client-side locale switching
  alternates: {
    canonical: APP_URL,
    languages: {
      'en': APP_URL,
      'ja': APP_URL,
      'es': APP_URL,
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
      </head>
      <body className="min-h-full flex flex-col">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
