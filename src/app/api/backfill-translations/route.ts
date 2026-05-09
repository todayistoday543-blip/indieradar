import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { translateToJaAndEs } from '@/lib/translator';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Phase 2: Translate EN → JA + ES for articles missing translations.
// claude-sonnet translation: ~60-120s/article. BATCH_SIZE=2 for ~240s total, under 300s.
const BATCH_SIZE = 2;

// Minimum EN length to qualify for translation — lowered to catch all articles with any EN content.
const EN_THRESHOLD = 100;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('backfill-translations', async () => {

  const supabase = createServiceClient();

  // Find articles that have long EN content but missing JA or ES translations.
  const { data: index, error: indexError } = await supabase
    .from('articles')
    .select('id, en_title, en_summary, en_insight, en_idea_catalyst, ja_summary, ja_idea_catalyst, es_summary, es_idea_catalyst')
    .not('en_summary', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (indexError) throw new Error(indexError.message);

  if (!index || index.length === 0) {
    return { items_processed: 0, items_failed: 0, output: { message: 'No articles found.' } };
  }

  // Qualify: has EN content but JA or ES is missing.
  const needsTranslation = index.filter(a =>
    a.en_summary && a.en_summary.length >= EN_THRESHOLD && (
      !a.ja_summary || !a.es_summary ||
      (a.en_idea_catalyst && a.en_idea_catalyst.length > 50 && (!a.ja_idea_catalyst || !a.es_idea_catalyst))
    )
  );

  if (needsTranslation.length === 0) {
    return { items_processed: 0, items_failed: 0, output: { message: `Phase 2 complete: all ${index.length} articles have JA+ES translations.` } };
  }

  const batch = needsTranslation.slice(0, BATCH_SIZE);
  const results: string[] = [];
  let updated = 0;

  for (const article of batch) {
    if (!article.en_title || !article.en_summary || !article.en_insight) {
      results.push(`[SKIP no-en] ${article.id}`);
      continue;
    }

    try {
      const translated = await translateToJaAndEs({
        en_title:          article.en_title,
        en_summary:        article.en_summary,
        en_insight:        article.en_insight,
        en_idea_catalyst:  article.en_idea_catalyst || undefined,
      });

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          ja_title:          translated.ja_title   || article.en_title,
          ja_summary:        translated.ja_summary || article.en_summary,
          ja_insight:        translated.ja_insight  || article.en_insight,
          ja_idea_catalyst:  translated.ja_idea_catalyst || article.en_idea_catalyst || null,
          es_title:          translated.es_title   || article.en_title,
          es_summary:        translated.es_summary || article.en_summary,
          es_insight:        translated.es_insight  || article.en_insight,
          es_idea_catalyst:  translated.es_idea_catalyst || article.en_idea_catalyst || null,
        })
        .eq('id', article.id);

      if (updateError) {
        results.push(`[UPDATE ERROR] ${article.id}: ${updateError.message}`);
      } else {
        updated++;
        results.push(
          `[JA+ES OK] ${article.en_title?.slice(0, 50)} — ja:${translated.ja_summary?.length ?? 0}c es:${translated.es_summary?.length ?? 0}c catalyst_ja:${translated.ja_idea_catalyst?.length ?? 0}c`
        );
      }
    } catch (e) {
      results.push(`[TRANSLATE ERROR] ${article.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  results.push(
    `--- Phase 2 done: ${updated}/${batch.length} translated. Still needs JA+ES: ~${needsTranslation.length - updated} ---`
  );

  return {
    items_processed: updated,
    items_failed: batch.length - updated,
    output: { results, remaining: needsTranslation.length - updated },
  };

  }); // end logAgentRun

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
