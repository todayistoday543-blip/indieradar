import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradar.jp'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/submit`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  // Dynamic article pages from Supabase
  let articlePages: MetadataRoute.Sitemap = []

  try {
    const supabase = createServiceClient()
    const { data: articles } = await supabase
      .from('articles')
      .select('id, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (articles) {
      articlePages = articles.map((article) => ({
        url: `${BASE_URL}/articles/${article.id}`,
        lastModified: new Date(article.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    }
  } catch {
    // If Supabase is unavailable, return only static pages
  }

  return [...staticPages, ...articlePages]
}
