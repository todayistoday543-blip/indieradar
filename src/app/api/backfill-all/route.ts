import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { enrichInEnglish, translateToJaAndEs, hasQualitySections } from '@/lib/translator';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// With quality validation + retry, a single article may take up to 3 enrichment attempts + 1 translation.
// Worst case: 3 × ~40s + ~40s = ~160s. BATCH_SIZE=1 stays safely under 300s.
const BATCH_SIZE = 1;

// Re-enrich EN content below this threshold.
// New prompt targets 3500-5000 chars; old was 2500-3500.
const SHORT_THRESHOLD = 3200;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('backfill-all', async () => {

  const supabase = createServiceClient();

  // Scan up to 1000 articles to find those needing EN re-enrichment:
  // - Short en_summary (old content)
  // - OR missing en_idea_catalyst (new field not yet generated)
  const { data: summaryIndex, error: indexError } = await supabase
    .from('articles')
    .select('id, en_summary, en_idea_catalyst')
    .not('original_content', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (indexError) throw new Error(indexError.message);

  if (!summaryIndex || summaryIndex.length === 0) {
    return { items_processed: 0, items_failed: 0, output: { message: 'No articles found in DB.' } };
  }

  const allNeedsWork = summaryIndex.filter(
    a => !a.en_summary
      || a.en_summary.length < SHORT_THRESHOLD
      || !a.en_idea_catalyst
      || !hasQualitySections(a.en_summary) // Missing 7-section structure
  );

  if (allNeedsWork.length === 0) {
    return { items_processed: 0, items_failed: 0, output: { message: `Phase 1 complete: all ${summaryIndex.length} articles OK.` } };
  }

  // Prioritize worst-quality articles first:
  // 1. No en_summary at all
  // 2. Missing section structure (old format)
  // 3. Too short
  // 4. Missing idea_catalyst only
  allNeedsWork.sort((a, b) => {
    const scoreA = (!a.en_summary ? 0 : !hasQualitySections(a.en_summary) ? 1 : (a.en_summary.length < SHORT_THRESHOLD ? 2 : 3));
    const scoreB = (!b.en_summary ? 0 : !hasQualitySections(b.en_summary) ? 1 : (b.en_summary.length < SHORT_THRESHOLD ? 2 : 3));
    return scoreA - scoreB;
  });

  const batchIds = allNeedsWork.slice(0, BATCH_SIZE).map(a => a.id);

  // Fetch full original content for just this batch.
  const { data: articles, error: fetchError } = await supabase
    .from('articles')
    .select('id, original_title, original_content, source')
    .in('id', batchIds);

  if (fetchError) throw new Error(fetchError.message);

  if (!articles || articles.length === 0) {
    return { items_processed: 0, items_failed: 0, output: { message: 'Batch fetch returned empty.' } };
  }

  const results: string[] = [];
  let updated = 0;

  for (const article of articles) {
    try {
      const enriched = await enrichInEnglish({
        original_title: article.original_title || '',
        original_content: article.original_content || '',
        source: article.source || '',
      });

      if (!enriched.is_business_case) {
        // Pad to SHORT_THRESHOLD so this article won't re-trigger on every run.
        await supabase
          .from('articles')
          .update({
            en_summary: ((enriched.en_summary || '(not a business case)') + ' ').padEnd(SHORT_THRESHOLD),
            en_idea_catalyst: '(not a business case)',
          })
          .eq('id', article.id);
        results.push(`[SKIP not-business] ${article.original_title?.slice(0, 50)}`);
        continue;
      }

      // Translate to JA + ES inline (instead of NULLing and waiting for backfill-translations)
      let translated: Awaited<ReturnType<typeof translateToJaAndEs>> | null = null;
      try {
        translated = await translateToJaAndEs({
          en_title:         enriched.en_title || '',
          en_summary:       enriched.en_summary || '',
          en_insight:       enriched.en_insight || '',
          en_idea_catalyst: enriched.en_idea_catalyst || '',
        });
      } catch (txErr) {
        results.push(`[TRANSLATE WARN] ${article.original_title?.slice(0, 40)}: ${txErr instanceof Error ? txErr.message : txErr}`);
      }

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          en_title:          enriched.en_title,
          en_summary:        enriched.en_summary,
          en_insight:        enriched.en_insight,
          en_idea_catalyst:  enriched.en_idea_catalyst || null,
          ja_difficulty:     enriched.ja_difficulty,
          business_model:    enriched.business_model || null,
          mrr_mentioned:     enriched.mrr_mentioned ?? null,
          // Write JA + ES translations inline
          ja_title:          translated?.ja_title   ?? null,
          ja_summary:        translated?.ja_summary ?? null,
          ja_insight:        translated?.ja_insight  ?? null,
          ja_idea_catalyst:  translated?.ja_idea_catalyst ?? null,
          es_title:          translated?.es_title   ?? null,
          es_summary:        translated?.es_summary ?? null,
          es_insight:        translated?.es_insight  ?? null,
          es_idea_catalyst:  translated?.es_idea_catalyst ?? null,
        })
        .eq('id', article.id);

      if (updateError) {
        results.push(`[UPDATE ERROR] ${article.id}: ${updateError.message}`);
      } else {
        updated++;
        const txStatus = translated ? 'JA+ES OK' : 'JA+ES MISSING';
        results.push(`[EN+${txStatus}] ${enriched.en_title?.slice(0, 50)} — ${enriched.en_summary?.length ?? 0}c summary`);
      }
    } catch (e) {
      results.push(`[ERROR] ${article.original_title?.slice(0, 40)}: ${e instanceof Error ? e.message : e}`);
    }
  }

  results.push(
    `--- Phase 1 done: ${updated}/${articles.length} EN re-enriched. Remaining: ~${allNeedsWork.length - updated} ---`
  );

  return {
    items_processed: updated,
    items_failed: articles.length - updated,
    output: { results, remaining: allNeedsWork.length - updated },
  };

  }); // end logAgentRun

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
