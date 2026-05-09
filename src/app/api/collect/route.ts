import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchHNStories, fetchRedditPosts, fetchPHPosts, fetchIHPosts } from '@/lib/collectors';
import { translateAndEnrich } from '@/lib/translator';
import { logAgentRun } from '@/lib/agents/logger';
import type { CollectedArticle } from '@/lib/collectors';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro max: 300s

const MAX_CONTENT_LENGTH = 5000;
// 2 Claude calls per article (enrich + translate). 10 × 2 × ~10s = ~200s — within 300s limit.
const MAX_ARTICLES_PER_RUN = 10;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Wrap entire collect run in agent logger
  const { log, result } = await logAgentRun('collect', async (supabase) => {

  const results: string[] = [];

  // --- 記事収集（4ソース） ---
  const collectors = [
    { name: 'HN',           fn: () => fetchHNStories() },
    { name: 'Reddit',       fn: () => fetchRedditPosts() },
    { name: 'ProductHunt',  fn: () => fetchPHPosts() },
    { name: 'IndieHackers', fn: () => fetchIHPosts() },
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

  if (allArticles.length === 0) {
    return { items_processed: 0, items_failed: 0, output: { results: [...results, 'No articles collected'], total_fetched: 0 } };
  }

  // --- 重複チェック（original_url で判定） ---
  const urls = allArticles.map((a) => a.original_url);
  const { data: existingRows, error: fetchError } = await supabase
    .from('articles')
    .select('original_url')
    .in('original_url', urls);

  if (fetchError) {
    throw new Error(`Duplicate check failed: ${fetchError.message}`);
  }

  const existingUrls = new Set((existingRows ?? []).map((r) => r.original_url));
  const newArticles = allArticles.filter((a) => !existingUrls.has(a.original_url));

  // 収益キーワードが含まれる投稿を優先（先頭に来るよう並べ替え）
  const revenueKeywords = /mrr|arr|revenue|月収|年収|\$[0-9]|income|profit/i;
  newArticles.sort((a, b) => {
    const aHas = revenueKeywords.test(a.original_title + ' ' + a.original_content) ? 1 : 0;
    const bHas = revenueKeywords.test(b.original_title + ' ' + b.original_content) ? 1 : 0;
    return bHas - aHas;
  });

  // Cap at MAX_ARTICLES_PER_RUN to control API costs
  const toProcess = newArticles.slice(0, MAX_ARTICLES_PER_RUN);

  results.push(`New: ${newArticles.length} / Processing: ${toProcess.length} / Duplicates skipped: ${existingUrls.size}`);

  // --- 翻訳 & 保存 ---
  let processed = 0;

  for (const article of toProcess) {
    let enriched: Awaited<ReturnType<typeof translateAndEnrich>>;
    try {
      enriched = await translateAndEnrich(article);
    } catch (e) {
      results.push(
        `[TRANSLATE ERROR] "${article.original_title.slice(0, 60)}": ${e instanceof Error ? e.message : e}`
      );
      continue;
    }

    // Skip non-business articles entirely — don't pollute the feed
    if (enriched.is_business_case === false) {
      results.push(`[SKIP] not a business case: "${article.original_title.slice(0, 60)}"`);
      continue;
    }

    const { error: insertError } = await supabase.from('articles').insert({
      source:             article.source,
      source_type:        'crawler',
      source_url:         article.original_url,
      original_url:       article.original_url,
      original_title:     article.original_title,
      original_content:   article.original_content.slice(0, MAX_CONTENT_LENGTH),
      author_profile_url: article.author_profile_url || null,
      // English base
      en_title:           enriched.en_title,
      en_summary:         enriched.en_summary,
      en_insight:         enriched.en_insight,
      en_idea_catalyst:   enriched.en_idea_catalyst || null,
      // Japanese (意訳)
      ja_title:           enriched.ja_title,
      ja_summary:         enriched.ja_summary,
      ja_insight:         enriched.ja_insight,
      ja_idea_catalyst:   enriched.ja_idea_catalyst || null,
      // Spanish (意訳)
      es_title:           enriched.es_title,
      es_summary:         enriched.es_summary,
      es_insight:         enriched.es_insight,
      es_idea_catalyst:   enriched.es_idea_catalyst || null,
      ja_difficulty:      enriched.ja_difficulty,
      business_model:     enriched.business_model || null,
      mrr_mentioned:      enriched.mrr_mentioned,
      upvotes:            article.upvotes,
      is_premium:         false,
      status:             'published',
      published_at:       article.published_at,
    });

    if (insertError) {
      results.push(
        `[INSERT ERROR] "${article.original_title.slice(0, 60)}": ${insertError.message}`
      );
      continue;
    }

    processed++;
    results.push(`[OK] saved: "${enriched.en_title?.slice(0, 50)}"`);
  }

  results.push(`--- Done: ${processed} saved / ${toProcess.length} attempted ---`);

  return {
    items_processed: processed,
    items_failed: toProcess.length - processed,
    output: { results, total_fetched: allArticles.length, new_found: newArticles.length, processed },
  };

  }); // end logAgentRun

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
