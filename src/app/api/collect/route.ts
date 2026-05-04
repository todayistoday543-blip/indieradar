import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchHNStories, fetchRedditPosts, fetchXPosts } from '@/lib/collectors';
import { translateAndEnrich } from '@/lib/translator';
import type { CollectedArticle } from '@/lib/collectors';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH = 5000;
const FREE_ARTICLE_LIMIT = 5;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Supabase クライアント初期化 — env vars が未設定なら早期エラー
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase not configured: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }

  const results: string[] = [];

  // --- 記事収集 ---
  const collectors = [
    { name: 'HN',     fn: () => fetchHNStories() },
    { name: 'Reddit', fn: () => fetchRedditPosts('indiehackers') },
    { name: 'X',      fn: () => fetchXPosts() },
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
    return NextResponse.json({ success: true, results: [...results, 'No articles collected'] });
  }

  // --- 重複チェック ---
  const urls = allArticles.map((a) => a.original_url);
  const { data: existingRows, error: fetchError } = await supabase
    .from('articles')
    .select('original_url')
    .in('original_url', urls);

  if (fetchError) {
    return NextResponse.json(
      { error: `Duplicate check failed: ${fetchError.message}` },
      { status: 500 }
    );
  }

  const existingUrls = new Set((existingRows ?? []).map((r) => r.original_url));
  const newArticles = allArticles.filter((a) => !existingUrls.has(a.original_url));

  results.push(`New: ${newArticles.length} / Duplicates skipped: ${existingUrls.size}`);

  // --- 翻訳 & 保存 ---
  let processed = 0;

  for (const article of newArticles) {
    // 1. 翻訳・エンリッチ
    let enriched: Awaited<ReturnType<typeof translateAndEnrich>>;
    try {
      enriched = await translateAndEnrich(article);
    } catch (e) {
      results.push(
        `[TRANSLATE ERROR] "${article.original_title.slice(0, 60)}": ${e instanceof Error ? e.message : e}`
      );
      continue; // 翻訳失敗は次の記事へ
    }

    // 2. Supabase に保存 — エラーを必ず確認する
    const { error: insertError } = await supabase.from('articles').insert({
      source:           article.source,
      source_type:      'crawler',
      original_url:     article.original_url,
      original_title:   article.original_title,
      original_content: article.original_content.slice(0, MAX_CONTENT_LENGTH),
      ja_title:         enriched.ja_title,
      ja_summary:       enriched.ja_summary,
      ja_insight:       enriched.ja_insight,
      ja_difficulty:    enriched.ja_difficulty,
      mrr_mentioned:    enriched.mrr_mentioned,
      upvotes:          article.upvotes,
      is_premium:       processed >= FREE_ARTICLE_LIMIT,
      status:           'published',           // ← 明示的に指定（追加）
      published_at:     article.published_at,
    });

    if (insertError) {
      results.push(
        `[INSERT ERROR] "${article.original_title.slice(0, 60)}": ${insertError.message}`
      );
      continue; // insert失敗は次の記事へ（processed は増やさない）
    }

    processed++;
    results.push(`[OK] saved: "${enriched.ja_title?.slice(0, 50)}"`);
  }

  results.push(`--- Done: ${processed} saved / ${newArticles.length} attempted ---`);

  return NextResponse.json({ success: true, results });
}
