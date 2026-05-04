import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchHNStories, fetchRedditPosts, fetchPHPosts, fetchIHPosts } from '@/lib/collectors';
import { translateAndEnrich } from '@/lib/translator';
import type { CollectedArticle } from '@/lib/collectors';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH = 5000;

// TODO: 将来対応 — 日本語ソース（note、Zenn）からの収集
// TODO: 将来対応 — 韓国語ソース（Velog等）からの収集
// TODO: 将来対応 — ヨーロッパ圏ソースからの収集
// TODO: 将来対応 — AI画像生成（記事サムネイル）

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

  // --- 記事収集（4ソース） ---
  const collectors = [
    { name: 'HN',            fn: () => fetchHNStories() },
    { name: 'Reddit',        fn: () => fetchRedditPosts() },
    { name: 'ProductHunt',   fn: () => fetchPHPosts() },
    { name: 'IndieHackers',  fn: () => fetchIHPosts() },
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

  // --- 重複チェック（original_url で判定） ---
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

  // 収益キーワードが含まれる投稿を優先（先頭に来るよう並べ替え）
  const revenueKeywords = /mrr|arr|revenue|月収|年収|\$[0-9]|income|profit/i;
  newArticles.sort((a, b) => {
    const aHas = revenueKeywords.test(a.original_title + ' ' + a.original_content) ? 1 : 0;
    const bHas = revenueKeywords.test(b.original_title + ' ' + b.original_content) ? 1 : 0;
    return bHas - aHas; // revenue-related first
  });

  results.push(`New: ${newArticles.length} / Duplicates skipped: ${existingUrls.size}`);

  // --- 翻訳 & 保存 ---
  let processed = 0;

  for (const article of newArticles) {
    // 1. 翻訳・エンリッチ（claude-sonnet-4-5）
    let enriched: Awaited<ReturnType<typeof translateAndEnrich>>;
    try {
      enriched = await translateAndEnrich(article);
    } catch (e) {
      results.push(
        `[TRANSLATE ERROR] "${article.original_title.slice(0, 60)}": ${e instanceof Error ? e.message : e}`
      );
      continue;
    }

    // 2. Supabase に保存 — エラーを必ず確認する
    const { error: insertError } = await supabase.from('articles').insert({
      source:              article.source,
      source_type:         'crawler',
      original_url:        article.original_url,
      original_title:      article.original_title,
      original_content:    article.original_content.slice(0, MAX_CONTENT_LENGTH),
      author_profile_url:  article.author_profile_url || null,
      ja_title:            enriched.ja_title,
      ja_summary:          enriched.ja_summary,
      ja_insight:          enriched.ja_insight,
      ja_difficulty:       enriched.ja_difficulty,
      business_model:      enriched.business_model || null,
      mrr_mentioned:       enriched.mrr_mentioned,
      upvotes:             article.upvotes,
      is_premium:          false,    // 一時開放中 — 全記事を無料公開
      status:              'published',
      published_at:        article.published_at,
    });

    if (insertError) {
      results.push(
        `[INSERT ERROR] "${article.original_title.slice(0, 60)}": ${insertError.message}`
      );
      continue;
    }

    processed++;
    results.push(`[OK] saved: "${enriched.ja_title?.slice(0, 50)}"`);
  }

  results.push(`--- Done: ${processed} saved / ${newArticles.length} attempted ---`);

  return NextResponse.json({ success: true, results });
}
