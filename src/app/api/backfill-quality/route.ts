import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { enrichInEnglish, translateToJaAndEs, hasQualitySections } from '@/lib/translator';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Bulk quality re-enrichment endpoint.
 * Processes 3 articles PER RUN in parallel to maximize throughput.
 * Each article: enrichInEnglish (with up to 2 retries) + translateToJaAndEs
 * 3 articles in parallel ≈ max ~160s (parallel, not sequential) — well within 300s.
 *
 * Cron: every 2 minutes during the sprint phase.
 */
const BATCH_SIZE = 3;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('backfill-quality', async () => {
    const supabase = createServiceClient();

    // Find articles needing quality upgrade — prioritize worst first
    const { data: candidates, error: fetchErr } = await supabase
      .from('articles')
      .select('id, en_summary, en_idea_catalyst, original_title, original_content, source')
      .eq('status', 'published')
      .not('original_content', 'is', null)
      .order('created_at', { ascending: true })
      .limit(500);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!candidates || candidates.length === 0) {
      return { items_processed: 0, items_failed: 0, output: { message: 'No articles found.' } };
    }

    // Filter to articles needing work
    const needsWork = candidates.filter(
      (a) =>
        !a.en_summary ||
        a.en_summary.length < 2000 ||
        !a.en_idea_catalyst ||
        a.en_idea_catalyst.length < 100 ||
        !hasQualitySections(a.en_summary),
    );

    if (needsWork.length === 0) {
      return {
        items_processed: 0,
        items_failed: 0,
        output: { message: `All ${candidates.length} scanned articles meet quality standards.`, done: true },
      };
    }

    // Prioritize: no summary > old format > short > missing catalyst only
    needsWork.sort((a, b) => {
      const score = (x: typeof a) => {
        if (!x.en_summary) return 0;
        if (!hasQualitySections(x.en_summary)) return 1;
        if (x.en_summary.length < 2000) return 2;
        return 3;
      };
      return score(a) - score(b);
    });

    const batch = needsWork.slice(0, BATCH_SIZE);
    const results: string[] = [];
    let processed = 0;
    let failed = 0;

    // Process all articles in the batch IN PARALLEL
    const promises = batch.map(async (article) => {
      try {
        const enriched = await enrichInEnglish({
          original_title: article.original_title || '',
          original_content: article.original_content || '',
          source: article.source || '',
        });

        if (!enriched.is_business_case) {
          await supabase
            .from('articles')
            .update({
              en_summary: '(not a business case)',
              en_idea_catalyst: '(not a business case)',
              status: 'flagged',
            })
            .eq('id', article.id);
          return { ok: false, msg: `[SKIP] not-business: ${article.original_title?.slice(0, 40)}` };
        }

        // Translate to JA + ES
        let translated: Awaited<ReturnType<typeof translateToJaAndEs>> | null = null;
        try {
          translated = await translateToJaAndEs({
            en_title: enriched.en_title || '',
            en_summary: enriched.en_summary || '',
            en_insight: enriched.en_insight || '',
            en_idea_catalyst: enriched.en_idea_catalyst || '',
          });
        } catch (txErr) {
          results.push(`[TX WARN] ${article.original_title?.slice(0, 30)}: ${txErr instanceof Error ? txErr.message : txErr}`);
        }

        const { error: updateErr } = await supabase
          .from('articles')
          .update({
            en_title: enriched.en_title,
            en_summary: enriched.en_summary,
            en_insight: enriched.en_insight,
            en_idea_catalyst: enriched.en_idea_catalyst || null,
            ja_difficulty: enriched.ja_difficulty,
            business_model: enriched.business_model || null,
            mrr_mentioned: enriched.mrr_mentioned ?? null,
            ja_title: translated?.ja_title ?? null,
            ja_summary: translated?.ja_summary ?? null,
            ja_insight: translated?.ja_insight ?? null,
            ja_idea_catalyst: translated?.ja_idea_catalyst ?? null,
            es_title: translated?.es_title ?? null,
            es_summary: translated?.es_summary ?? null,
            es_insight: translated?.es_insight ?? null,
            es_idea_catalyst: translated?.es_idea_catalyst ?? null,
          })
          .eq('id', article.id);

        if (updateErr) {
          return { ok: false, msg: `[DB ERR] ${article.id}: ${updateErr.message}` };
        }

        const txTag = translated ? 'EN+JA+ES' : 'EN only';
        return { ok: true, msg: `[${txTag}] ${enriched.en_title?.slice(0, 45)} — ${enriched.en_summary?.length}c` };
      } catch (e) {
        return { ok: false, msg: `[ERROR] ${article.original_title?.slice(0, 40)}: ${e instanceof Error ? e.message : e}` };
      }
    });

    const outcomes = await Promise.allSettled(promises);

    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') {
        if (outcome.value.ok) processed++;
        else failed++;
        results.push(outcome.value.msg);
      } else {
        failed++;
        results.push(`[CRASH] ${outcome.reason?.message ?? 'unknown'}`);
      }
    }

    results.push(`--- Batch done: ${processed}/${batch.length} OK. Remaining: ~${needsWork.length - processed} ---`);

    return {
      items_processed: processed,
      items_failed: failed,
      output: { results, remaining: needsWork.length - processed, total_scanned: candidates.length },
    };
  });

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
