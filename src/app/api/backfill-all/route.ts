import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { translateAndEnrich } from '@/lib/translator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Small batch per run: re-enrichment uses claude-sonnet + two large completions per article
const BATCH_SIZE = 3;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase not configured: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }

  // Fetch a window of articles (oldest first) with their summaries to check length.
  // We re-enrich articles whose en_summary is short (< 1800 chars) — these were generated
  // with older, shorter prompts and need upgrading to the new expanded format.
  const { data: articles, error: fetchError } = await supabase
    .from('articles')
    .select('id, original_title, original_content, source, en_summary')
    .not('original_title', 'is', null)
    .not('original_content', 'is', null)
    .order('created_at', { ascending: true })
    .limit(60); // fetch a larger window, filter client-side

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ success: true, message: 'No articles to re-enrich.' });
  }

  // Keep only short-summary articles
  const toProcess = articles
    .filter(a => !a.en_summary || a.en_summary.length < 1800)
    .slice(0, BATCH_SIZE);

  if (toProcess.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'All articles in the current window already have expanded content (≥1800 chars). Backfill complete or advance the window.',
    });
  }

  const results: string[] = [];
  let updated = 0;

  for (const article of toProcess) {
    try {
      const enriched = await translateAndEnrich({
        original_title: article.original_title || '',
        original_content: article.original_content || '',
        source: article.source || '',
      });

      if (!enriched.is_business_case) {
        results.push(`[SKIP not-business] ${article.original_title?.slice(0, 50)}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          en_title:    enriched.en_title,
          en_summary:  enriched.en_summary,
          en_insight:  enriched.en_insight,
          ja_title:    enriched.ja_title,
          ja_summary:  enriched.ja_summary,
          ja_insight:  enriched.ja_insight,
          es_title:    enriched.es_title,
          es_summary:  enriched.es_summary,
          es_insight:  enriched.es_insight,
          ja_difficulty: enriched.ja_difficulty,
          business_model: enriched.business_model || null,
          mrr_mentioned:  enriched.mrr_mentioned ?? null,
        })
        .eq('id', article.id);

      if (updateError) {
        results.push(`[UPDATE ERROR] ${article.id}: ${updateError.message}`);
      } else {
        updated++;
        results.push(`[OK] ${enriched.en_title?.slice(0, 50)} (${enriched.en_summary?.length ?? 0} chars)`);
      }
    } catch (e) {
      results.push(`[ENRICH ERROR] ${article.original_title?.slice(0, 40)}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Count how many still need processing
  const { count: remaining } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .not('original_content', 'is', null);

  results.push(`--- Done: ${updated}/${toProcess.length} updated. Total articles: ${remaining ?? '?'} ---`);

  return NextResponse.json({ success: true, results });
}
