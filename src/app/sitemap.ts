import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com').trim();

// Revalidate every hour so new articles appear in the sitemap quickly
export const revalidate = 3600;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: APP_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    url: `${APP_URL}/articles`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  },
  {
    url: `${APP_URL}/weekly`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  // /pricing is noindex — excluded from sitemap intentionally
  {
    url: `${APP_URL}/dashboard`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    url: `${APP_URL}/submit`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch all published article IDs + timestamps (no auth needed, articles are public)
    const { data: articles } = await supabase
      .from('articles')
      .select('id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10000);

    const articleRoutes: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
      url: `${APP_URL}/articles/${a.id}`,
      lastModified: new Date(a.updated_at ?? a.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...STATIC_ROUTES, ...articleRoutes];
  } catch {
    // On DB error, still return static routes so the sitemap is never empty
    return STATIC_ROUTES;
  }
}
