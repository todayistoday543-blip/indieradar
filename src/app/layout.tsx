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
    icon: '/icon.svg',
  },
  title: {
    default: 'NicheHunt — 海外インディーハッカーのマネタイズ事例',
    template: '%s | NicheHunt',
  },
  description:
    '海外インディーハッカーのマネタイズ事例をAIが自動収集・翻訳。Hacker News, Product Hunt, Reddit, X から毎日更新。9言語対応。',
  keywords: [
    'インディーハッカー',
    'indie hacker',
    'マネタイズ',
    'SaaS',
    'MRR',
    '副業',
    '個人開発',
    'Hacker News',
    'Product Hunt',
    'NicheHunt',
  ],
  authors: [{ name: 'NicheHunt' }],
  creator: 'NicheHunt',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: APP_URL,
    siteName: 'NicheHunt',
    title: 'NicheHunt — 海外インディーハッカーのマネタイズ事例',
    description:
      '海外インディーハッカーのマネタイズ事例をAIが自動収集・翻訳。毎日更新、9言語対応。',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NicheHunt',
    description:
      '海外インディーハッカーのマネタイズ事例をAIが自動収集・翻訳。',
  },
  robots: {
    index: true,
    follow: true,
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
      lang="ja"
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
