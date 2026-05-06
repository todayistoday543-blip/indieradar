import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ARTICLE_COLUMNS =
  'id,source,original_title,en_title,en_summary,en_insight,ja_title,ja_summary,ja_insight,es_title,es_summary,es_insight,ja_difficulty,business_model,mrr_mentioned,upvotes,upvote_count,view_count,is_premium,original_url,created_at';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get('week'); // ISO date string, e.g. "2026-05-04"

  // Determine the week window (Monday 00:00 UTC to Sunday 23:59:59 UTC)
  let weekStart: Date;

  if (weekParam) {
    weekStart = new Date(weekParam);
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json({ error: 'Invalid week parameter' }, { status: 400 });
    }
  } else {
    weekStart = new Date();
  }

  // Roll back to the most recent Monday
  const day = weekStart.getUTCDay(); // 0=Sun,1=Mon,...6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase config: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_COLUMNS)
    .eq('status', 'published')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())
    .order('upvotes', { ascending: false })
    .limit(50); // fetch more than 10 so we can score and re-sort client-side

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, hint: error.hint },
      { status: 500 },
    );
  }

  // Compute combined score and pick top 10
  const scored = (data || [])
    .map((article) => ({
      ...article,
      combined_score:
        (article.upvotes ?? 0) * 2 +
        (article.view_count ?? 0) +
        (article.mrr_mentioned ? 500 : 0),
    }))
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, 10);

  const res = NextResponse.json({
    articles: scored,
    week_start: weekStart.toISOString(),
    week_end: weekEnd.toISOString(),
  });

  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
  return res;
}
