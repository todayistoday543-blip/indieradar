import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Business model category mapping — same as articles API
const BUSINESS_MODEL_CATEGORIES: Record<string, string[]> = {
  saas: ['SaaS', 'saas', 'Subscription SaaS', 'Freemium SaaS', 'B2B SaaS', 'Micro-SaaS', 'マイクロSaaS', 'Vertical SaaS'],
  marketplace: ['Marketplace', 'marketplace', 'マーケットプレイス', 'Platform'],
  ecommerce: ['E-commerce', 'ecommerce', 'Eコマース', 'D2C', 'Print-on-Demand', 'ドロップシッピング'],
  api: ['API', 'api', 'Data-as-a-Service', 'DaaS'],
  digital_products: ['Digital Products', 'デジタルプロダクト', 'デジタルコンテンツ', 'コンテンツ販売', 'ebook', 'template', 'course', 'コース'],
  services: ['Services', 'Consulting', 'コンサルティング', 'サービス', 'Freelance', 'フリーランス', 'Agency', 'エージェンシー', '代行'],
  content: ['Content', 'コンテンツ', 'Newsletter', 'ニュースレター', 'Media', 'メディア', 'Affiliate', 'アフィリエイト', 'AdSense', '広告収益'],
  community: ['Community', 'コミュニティ', 'Platform'],
  opensource: ['Open Source', 'オープンソース', 'Open Core'],
  hardware: ['Hardware', 'ハードウェア', '製品販売'],
  subscription: ['Subscription', 'サブスクリプション'],
};

function matchesCategory(businessModel: string | null, category: string): boolean {
  if (!businessModel) return false;
  const patterns = BUSINESS_MODEL_CATEGORIES[category];
  if (!patterns) return false;
  const lower = businessModel.toLowerCase();
  return patterns.some(p => lower.includes(p.toLowerCase()));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

interface Article {
  id: string;
  source: string;
  en_title: string | null;
  ja_title: string | null;
  ja_difficulty: string | null;
  business_model: string | null;
  mrr_mentioned: number | null;
  upvotes: number;
  view_count: number;
  created_at: string;
  status: string;
}

export async function GET() {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase config: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  // Fetch all published articles
  const { data, error } = await supabase
    .from('articles')
    .select('id,source,en_title,ja_title,ja_difficulty,business_model,mrr_mentioned,upvotes,view_count,created_at,status')
    .eq('status', 'published');

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 }
    );
  }

  const articles = (data || []) as Article[];
  const total_articles = articles.length;
  const mrrArticles = articles.filter(a => a.mrr_mentioned != null && a.mrr_mentioned > 0);
  const mrr_articles = mrrArticles.length;
  const mrrValues = mrrArticles.map(a => a.mrr_mentioned!);
  const avg_mrr = mrr_articles > 0
    ? Math.round(mrrValues.reduce((s, v) => s + v, 0) / mrr_articles)
    : 0;
  const median_mrr = median(mrrValues);

  // By source
  const by_source: Record<string, { count: number; avg_mrr: number }> = {};
  for (const src of ['hackernews', 'reddit', 'producthunt', 'indiehackers']) {
    const srcArticles = mrrArticles.filter(a => a.source === src);
    const allSrcArticles = articles.filter(a => a.source === src);
    const srcMrrs = srcArticles.map(a => a.mrr_mentioned!);
    by_source[src] = {
      count: allSrcArticles.length,
      avg_mrr: srcMrrs.length > 0
        ? Math.round(srcMrrs.reduce((s, v) => s + v, 0) / srcMrrs.length)
        : 0,
    };
  }

  // By category
  const by_category: Record<string, { count: number; avg_mrr: number }> = {};
  for (const cat of Object.keys(BUSINESS_MODEL_CATEGORIES)) {
    const catArticles = articles.filter(a => matchesCategory(a.business_model, cat));
    const catMrr = catArticles.filter(a => a.mrr_mentioned != null && a.mrr_mentioned > 0);
    const catMrrValues = catMrr.map(a => a.mrr_mentioned!);
    by_category[cat] = {
      count: catArticles.length,
      avg_mrr: catMrrValues.length > 0
        ? Math.round(catMrrValues.reduce((s, v) => s + v, 0) / catMrrValues.length)
        : 0,
    };
  }

  // By difficulty
  const by_difficulty: Record<string, { count: number; avg_mrr: number }> = {};
  for (const diff of ['Easy', 'Medium', 'Hard']) {
    const diffArticles = articles.filter(a => a.ja_difficulty === diff);
    const diffMrr = diffArticles.filter(a => a.mrr_mentioned != null && a.mrr_mentioned > 0);
    const diffMrrValues = diffMrr.map(a => a.mrr_mentioned!);
    by_difficulty[diff] = {
      count: diffArticles.length,
      avg_mrr: diffMrrValues.length > 0
        ? Math.round(diffMrrValues.reduce((s, v) => s + v, 0) / diffMrrValues.length)
        : 0,
    };
  }

  // MRR distribution
  const ranges = [
    { range: '$0-1K', min: 0, max: 1000 },
    { range: '$1K-5K', min: 1000, max: 5000 },
    { range: '$5K-10K', min: 5000, max: 10000 },
    { range: '$10K-50K', min: 10000, max: 50000 },
    { range: '$50K+', min: 50000, max: Infinity },
  ];
  const mrr_distribution = ranges.map(({ range, min, max }) => ({
    range,
    count: mrrArticles.filter(a => {
      const v = a.mrr_mentioned!;
      return v >= min && v < max;
    }).length,
  }));

  // Top earners
  const top_earners = [...mrrArticles]
    .sort((a, b) => (b.mrr_mentioned ?? 0) - (a.mrr_mentioned ?? 0))
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      // Use English title for admin display; fall back to ja_title for older articles
      ja_title: a.en_title || a.ja_title || '',
      mrr_mentioned: a.mrr_mentioned,
      source: a.source,
    }));

  const res = NextResponse.json({
    total_articles,
    mrr_articles,
    avg_mrr,
    median_mrr,
    by_source,
    by_category,
    by_difficulty,
    mrr_distribution,
    top_earners,
  });

  res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
  return res;
}
