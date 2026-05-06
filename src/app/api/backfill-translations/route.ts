import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { translateToJaAndEs } from '@/lib/translator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Phase 2: Translate EN → JA + ES for articles that have expanded EN content
// but are missing JA or ES translations.
// claude-sonnet translation: ~60-90s/article. 3 × ~80s ≈ 240s < 300s.
const BATCH_SIZE = 3;

// Minimum EN length to qualify for translation (matches Phase 1 threshold).
const EN_THRESHOLD = 3200;

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

  // Find articles that have long EN content but missing JA or ES translations.
  // We scan a window and filter client-side because PostgREST can't do len() < N.
  const { data: index, error: indexError } = await supabase
    .from('articles')
    .select('id, en_title, en_summary, en_insight, ja_summary, es_summary')
    .not('en_summary', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (indexError) {
    return NextResponse.json({ error: indexError.message }, { status: 500 });
  }

  if (!index || index.length === 0) {
    return NextResponse.json({ success: true, message: 'No articles found.' });
  }

  // Qualify: EN is long (Phase 1 done) but JA or ES is missing/short.
  const needsTranslation = index.filter(a =>
    a.en_summary && a.en_summary.length >= EN_THRESHOLD &&
    (!a.ja_summary || a.ja_summary.length < 2500 || !a.es_summary || a.es_summary.length < 2500)
  );

  if (needsTranslation.length === 0) {
    return NextResponse.json({
      success: true,
      message: `Phase 2 complete: all ${index.length} articles with long EN content have JA+ES translations.`,
    });
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
        en_title:   article.en_title,
        en_summary: article.en_summary,
        en_insight: article.en_insight,
      });

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          ja_title:   translated.ja_title   || article.en_title,
          ja_summary: translated.ja_summary || article.en_summary,
          ja_insight: translated.ja_insight || article.en_insight,
          es_title:   translated.es_title   || article.en_title,
          es_summary: translated.es_summary || article.en_summary,
          es_insight: translated.es_insight || article.en_insight,
        })
        .eq('id', article.id);

      if (updateError) {
        results.push(`[UPDATE ERROR] ${article.id}: ${updateError.message}`);
      } else {
        updated++;
        results.push(
          `[JA+ES OK] ${article.en_title?.slice(0, 50)} — ja:${translated.ja_summary?.length ?? 0}c es:${translated.es_summary?.length ?? 0}c`
        );
      }
    } catch (e) {
      results.push(`[TRANSLATE ERROR] ${article.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  results.push(
    `--- Phase 2 done: ${updated}/${batch.length} translated. Still needs JA+ES: ~${needsTranslation.length - updated} ---`
  );

  return NextResponse.json({ success: true, results });
}
