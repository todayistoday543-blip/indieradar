import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ARTICLE_COLUMNS = 'id,source,original_title,ja_title,ja_summary,ja_insight,ja_difficulty,business_model,mrr_mentioned,upvotes,is_premium,original_url,author_profile_url,created_at,view_count,upvote_count';
const VALID_SOURCES = ['hackernews', 'producthunt', 'reddit', 'indiehackers'];
const VALID_SORTS = ['new', 'heat', 'upvotes', 'views', 'revenue', 'easy', 'small', 'priority'];

// Business model category mapping — used for filtering
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20') || 20), 50);
  const source = searchParams.get('source');
  const sort = searchParams.get('sort') || 'new';
  const category = searchParams.get('category');
  const offset = (page - 1) * limit;

  if (source && !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase config: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  // Determine sort column and direction
  let orderColumn = 'created_at';
  let ascending = false;

  switch (sort) {
    case 'upvotes':
      orderColumn = 'upvote_count';
      break;
    case 'views':
      orderColumn = 'view_count';
      break;
    case 'heat':
      orderColumn = 'upvotes'; // original source upvotes as heat proxy
      break;
    case 'revenue':
      orderColumn = 'mrr_mentioned';
      break;
    case 'easy':
      // Uses generated difficulty_order column: Easy=1, Medium=2, Hard=3
      orderColumn = 'difficulty_order';
      ascending = true;
      break;
    case 'small':
      orderColumn = 'mrr_mentioned';
      ascending = true;
      break;
    case 'priority':
      orderColumn = 'upvotes'; // combined heat + revenue signal
      break;
    case 'new':
    default:
      orderColumn = 'created_at';
      break;
  }

  // For "easy" sort, we need a different approach since difficulty is text (Easy/Medium/Hard)
  // For "priority" sort, we want articles with both high upvotes AND revenue
  // We'll handle these with multiple sort columns

  let query = supabase
    .from('articles')
    .select(ARTICLE_COLUMNS, { count: 'exact' })
    .eq('status', 'published');

  if (source) {
    query = query.eq('source', source);
  }

  // Category filtering via business_model text matching
  if (category && BUSINESS_MODEL_CATEGORIES[category]) {
    const patterns = BUSINESS_MODEL_CATEGORIES[category];
    // Build an OR filter with ilike for each pattern
    const orFilter = patterns.map(p => `business_model.ilike.%${p}%`).join(',');
    query = query.or(orFilter);
  }

  // Apply sorting
  if (sort === 'priority') {
    // Priority: high upvotes first, then by MRR
    query = query
      .order('upvotes', { ascending: false })
      .order('mrr_mentioned', { ascending: false, nullsFirst: false });
  } else if (sort === 'easy') {
    // Easy(1) → Medium(2) → Hard(3), tie-break by upvotes
    query = query
      .order('difficulty_order', { ascending: true, nullsFirst: false })
      .order('upvotes', { ascending: false });
  } else {
    query = query.order(orderColumn, { ascending, nullsFirst: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, hint: error.hint },
      { status: 500 }
    );
  }

  const res = NextResponse.json({
    articles: data,
    total: count,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });

  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res;
}
