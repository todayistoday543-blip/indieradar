import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradar.jp';

type Props = {
  params: Promise<{ id: string }>;
};

/** Strip markdown and HTML, collapse whitespace, truncate */
function toPlainText(raw: string, maxLen = 160): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: article } = await supabase
    .from('articles')
    .select('en_title, en_summary, en_insight, original_title, source, mrr_mentioned, business_model, created_at')
    .eq('id', id)
    .single();

  if (!article) {
    return {
      title: 'Article',
      description: 'Indie hacker monetization case study on IndieRadar.',
    };
  }

  const title = article.en_title || article.original_title || 'Article';

  const rawDesc = article.en_summary || article.en_insight || '';
  const description = rawDesc
    ? toPlainText(rawDesc, 160)
    : `Indie hacker monetization case study from ${article.source}. AI-curated on IndieRadar.`;

  const ogImageUrl = `${APP_URL}/api/og?title=${encodeURIComponent(title)}`;
  const pageUrl = `${APP_URL}/articles/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: pageUrl,
      publishedTime: article.created_at,
      siteName: 'IndieRadar',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 200),
      images: [ogImageUrl],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default function ArticleDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}