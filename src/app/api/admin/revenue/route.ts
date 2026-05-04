import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { admin_secret, period_month, total_revenue_usd } = body;

  if (admin_secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!period_month || typeof period_month !== 'string') {
    return NextResponse.json({ error: 'period_month required (YYYY-MM format)' }, { status: 400 });
  }

  if (typeof total_revenue_usd !== 'number' || total_revenue_usd < 0) {
    return NextResponse.json({ error: 'total_revenue_usd must be a non-negative number' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: userArticles, error: fetchError } = await supabase
    .from('articles')
    .select('id, author_id, upvotes')
    .eq('source_type', 'user')
    .eq('status', 'published')
    .not('author_id', 'is', null);

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  if (!userArticles || userArticles.length === 0) {
    return NextResponse.json({ message: '対象記事なし', shares_created: 0 });
  }

  const totalUpvotes = userArticles.reduce(
    (sum, a) => sum + (a.upvotes || 1),
    0
  );

  const authorShare = total_revenue_usd * 0.7;
  const shares = [];

  for (const article of userArticles) {
    const weight = (article.upvotes || 1) / totalUpvotes;
    const revenue = authorShare * weight;

    shares.push({
      article_id: article.id,
      author_id: article.author_id,
      period_month,
      impressions: article.upvotes || 0,
      revenue_usd: Math.round(revenue * 10000) / 10000,
      paid_out: false,
    });
  }

  const { error: insertError } = await supabase
    .from('revenue_shares')
    .insert(shares);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: '収益計算完了',
    shares_created: shares.length,
    total_distributed_usd: authorShare,
  });
}
