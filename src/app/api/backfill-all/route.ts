import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { translateAndEnrich } from '@/lib/translator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Small batch per run: re-enrichment uses claude-sonnet + two large completions per article.
// 3 articles × ~80s each ≈ 240s — safely within the 300s limit.
const BATCH_SIZE = 3;

// Re-enrich anything below this char count.
// Old prompts targeted 2500-3500 chars; new prompts target 3500-5000 chars.
const SHORT_THRESHOLD = 3200;

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

  // Step 1: Scan up to 1000 articles (id + en_summary only) to find short ones.
  // PostgREST has no "len(column) < N" filter, so we do it client-side.
  // Ordered oldest-first so we always make forward progress through the backlog.
  const { data: summaryIndex, error: indexError } = await supabase
    .from('articles')
    .select('id, en_summary')
    .not('original_content', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (indexError) {
    return NextResponse.json({ error: indexError.message }, { status: 500 });
  }

  if (!summaryIndex || summaryIndex.length === 0) {
    return NextResponse.json({ success: true, message: 'No articles found in DB.' });
  }

  const allShort = summaryIndex.filter(
    a => !a.en_summary || a.en_summary.length < SHORT_THRESHOLD
  );

  if (allShort.length === 0) {
    return NextResponse.json({
      success: true,
      message: `All ${summaryIndex.length} articles already have expanded content (≥${SHORT_THRESHOLD} chars). Backfill complete!`,
    });
  }

  const batchIds = allShort.slice(0, BATCH_SIZE).map(a => a.id);

  // Step 2: Fetch full content only for the small batch we'll re-enrich.
  const { data: articles, error: fetchError } = await supabase
    .from('articles')
    .select('id, original_title, original_content, source')
    .in('id', batchIds);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ success: true, message: 'Batch fetch returned empty.' });
  }

  const results: string[] = [];
  let updated = 0;

  for (const article of articles) {
    try {
      const enriched = await translateAndEnrich({
        original_title: article.original_title || '',
        original_content: article.original_content || '',
        source: article.source || '',
      });

      if (!enriched.is_business_case) {
        // Still mark it as "processed" by setting a placeholder, so it won't keep re-running
        await supabase
          .from('articles')
          .update({ en_summary: (enriched.en_summary || '(not a business case)').padEnd(SHORT_THRESHOLD, ' ') })
          .eq('id', article.id);
        results.push(`[SKIP not-business] ${article.original_title?.slice(0, 50)}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          en_title:       enriched.en_title,
          en_summary:     enriched.en_summary,
          en_insight:     enriched.en_insight,
          ja_title:       enriched.ja_title,
          ja_summary:     enriched.ja_summary,
          ja_insight:     enriched.ja_insight,
          es_title:       enriched.es_title,
          es_summary:     enriched.es_summary,
          es_insight:     enriched.es_insight,
          ja_difficulty:  enriched.ja_difficulty,
          business_model: enriched.business_model || null,
          mrr_mentioned:  enriched.mrr_mentioned ?? null,
        })
        .eq('id', article.id);

      if (updateError) {
        results.push(`[UPDATE ERROR] ${article.id}: ${updateError.message}`);
      } else {
        updated++;
        results.push(
          `[OK] ${enriched.en_title?.slice(0, 50)} — en:${enriched.en_summary?.length ?? 0}c ja:${enriched.ja_summary?.length ?? 0}c es:${enriched.es_summary?.length ?? 0}c`
        );
      }
    } catch (e) {
      results.push(
        `[ENRICH ERROR] ${article.original_title?.slice(0, 40)}: ${e instanceof Error ? e.message : e}`
      );
    }
  }

  const remainingAfter = allShort.length - updated;
  results.push(
    `--- Done: ${updated}/${articles.length} updated. Remaining short articles: ~${remainingAfter} / ${summaryIndex.length} total scanned ---`
  );

  return NextResponse.json({ success: true, results });
}
