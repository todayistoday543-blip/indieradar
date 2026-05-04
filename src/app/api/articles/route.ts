import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ARTICLE_COLUMNS = 'id,source,ja_title,ja_summary,ja_insight,ja_difficulty,business_model,mrr_mentioned,upvotes,is_premium,original_url,author_profile_url,created_at,view_count,upvote_count';
const VALID_SOURCES = ['hackernews', 'producthunt', 'reddit', 'indiehackers'];
const VALID_SORTS = ['heat', 'upvotes', 'views', 'new'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20') || 20), 50);
  const source = searchParams.get('source');
  const sort = searchParams.get('sort') || 'new';
  const offset = (page - 1) * limit;

  if (source && !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Determine sort column and direction
  let orderColumn = 'created_at';
  const ascending = false;

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
    case 'new':
    default:
      orderColumn = 'created_at';
      break;
  }

  let query = supabase
    .from('articles')
    .select(ARTICLE_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .order(orderColumn, { ascending })
    .range(offset, offset + limit - 1);

  if (source) {
    query = query.eq('source', source);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
