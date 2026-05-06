import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { enrichInEnglish } from '@/lib/translator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Phase 1: Re-generate English content only (claude-sonnet, ~60-90s/article).
// 3 articles × ~80s each ≈ 240s — within the 300s Vercel Pro limit.
// Phase 2: JA + ES translation is handled by /api/backfill-translations.
const BATCH_SIZE = 3;

// Re-enrich EN content below this threshold.
// New prompt targets 3500-5000 chars; old was 2500-3500.
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

  // Scan up to 1000 articles to find those with short en_summary.
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
      message: `Phase 1 complete: all ${summaryIndex.length} articles have EN content ≥${SHORT_THRESHOLD} chars.`,
    });
  }

  const batchIds = allShort.slice(0, BATCH_SIZE).map(a => a.id);

  // Fetch full original content for just this batch.
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
          })
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
          ja_difficulty:  enriched.ja_difficulty,
          business_model: enriched.business_model || null,
          mrr_mentioned:  enriched.mrr_mentioned ?? null,
          // Clear ja/es so backfill-translations picks them up next.
          ja_title:    null,
          ja_summary:  null,
          ja_insight:  null,
          es_title:    null,
          es_summary:  null,
          es_insight:  null,
        })
        .eq('id', article.id);

      if (updateError) {
        results.push(`[UPDATE ERROR] ${article.id}: ${updateError.message}`);
      } else {
        updated++;
        results.push(`[EN OK] ${enriched.en_title?.slice(0, 50)} — ${enriched.en_summary?.length ?? 0} chars`);
      }
    } catch (e) {
      results.push(`[ERROR] ${article.original_title?.slice(0, 40)}: ${e instanceof Error ? e.message : e}`);
    }
  }

  results.push(
    `--- Phase 1 done: ${updated}/${articles.length} EN re-enriched. Remaining: ~${allShort.length - updated} ---`
  );

  return NextResponse.json({ success: true, results });
}
