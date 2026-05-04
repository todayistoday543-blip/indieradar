import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchHNStories, fetchRedditPosts, fetchXPosts } from '@/lib/collectors';
import { translateAndEnrich } from '@/lib/translator';
import type { CollectedArticle } from '@/lib/collectors';

const MAX_CONTENT_LENGTH = 5000;
const FREE_ARTICLE_LIMIT = 5;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results: string[] = [];

  const collectors = [
    { name: 'HN', fn: () => fetchHNStories() },
    { name: 'Reddit', fn: () => fetchRedditPosts('indiehackers') },
    { name: 'X', fn: () => fetchXPosts() },
  ];

  const settled = await Promise.allSettled(collectors.map((c) => c.fn()));
  const allArticles: CollectedArticle[] = [];

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
      results.push(`${collectors[i].name}: ${result.value.length} fetched`);
    } else {
      results.push(`${collectors[i].name}: error - ${result.reason?.message ?? 'unknown'}`);
    }
  });

  const urls = allArticles.map((a) => a.original_url);
  const { data: existingRows } = await supabase
    .from('articles')
    .select('original_url')
    .in('original_url', urls);

  const existingUrls = new Set((existingRows ?? []).map((r) => r.original_url));
  const newArticles = allArticles.filter((a) => !existingUrls.has(a.original_url));

  let processed = 0;
  for (const article of newArticles) {
    try {
      const enriched = await translateAndEnrich(article);

      await supabase.from('articles').insert({
        source: article.source,
        original_url: article.original_url,
        original_title: article.original_title,
        original_content: article.original_content.slice(0, MAX_CONTENT_LENGTH),
        ja_title: enriched.ja_title,
        ja_summary: enriched.ja_summary,
        ja_insight: enriched.ja_insight,
        ja_difficulty: enriched.ja_difficulty,
        mrr_mentioned: enriched.mrr_mentioned,
        upvotes: article.upvotes,
        is_premium: processed >= FREE_ARTICLE_LIMIT,
        published_at: article.published_at,
      });

      processed++;
    } catch (e) {
      results.push(
        `Translate error for "${article.original_title.slice(0, 60)}": ${e instanceof Error ? e.message : 'unknown'}`
      );
    }
  }

  results.push(`Processed: ${processed} new articles (${newArticles.length} candidates, ${existingUrls.size} duplicates skipped)`);

  return NextResponse.json({ success: true, results });
}
