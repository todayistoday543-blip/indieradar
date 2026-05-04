#!/usr/bin/env node
/**
 * collect-and-enrich.mjs
 *
 * Standalone collection + AI enrichment pipeline for IndieRadar JP.
 * Fetches articles from HN + Reddit, enriches with Claude, saves to Supabase.
 *
 * Prerequisites:
 *   - Set environment variables (or create .env.local):
 *     NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 *     SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
 *     ANTHROPIC_API_KEY=sk-ant-api03-...
 *
 * Usage:
 *   node scripts/collect-and-enrich.mjs
 *   node scripts/collect-and-enrich.mjs --dry-run   (fetch only, no AI/DB)
 *   node scripts/collect-and-enrich.mjs --limit 10  (process max 10 articles)
 *   node scripts/collect-and-enrich.mjs --source hn (only HN)
 *   node scripts/collect-and-enrich.mjs --source reddit (only Reddit)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if exists
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
    console.log('  ✓ Loaded .env.local');
  } catch {
    console.log('  ⚠ No .env.local found, using existing env vars');
  }
}

loadEnv();

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => {
  const idx = args.indexOf('--limit');
  return idx !== -1 ? parseInt(args[idx + 1]) || 20 : 20;
})();
const SOURCE_FILTER = (() => {
  const idx = args.indexOf('--source');
  return idx !== -1 ? args[idx + 1] : 'all';
})();

// ─────────────────────────────────────────────
// Config validation
// ─────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

function validateConfig() {
  const issues = [];
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project') || SUPABASE_URL.includes('placeholder')) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL is not set (has placeholder value)');
  }
  if (!SUPABASE_KEY || SUPABASE_KEY.includes('your-') || SUPABASE_KEY === 'placeholder') {
    issues.push('SUPABASE_SERVICE_ROLE_KEY is not set (has placeholder value)');
  }
  if (!ANTHROPIC_KEY || ANTHROPIC_KEY.includes('your-key') || ANTHROPIC_KEY === 'placeholder') {
    issues.push('ANTHROPIC_API_KEY is not set (has placeholder value)');
  }
  return issues;
}

// ─────────────────────────────────────────────
// Revenue keyword scoring
// ─────────────────────────────────────────────
const REVENUE_KEYWORDS = [
  'mrr', 'arr', 'revenue', 'profit', 'income', 'earning',
  '$', 'k/mo', 'k/month', '/month', '/mo', 'monetiz',
  'paying customer', 'subscriber', 'bootstrap',
  'ramen profitable', 'break even', 'cash flow',
  'launched', 'making money', 'first sale'
];

function revenueScore(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return REVENUE_KEYWORDS.filter(kw => lower.includes(kw)).length;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// 1. Hacker News Collector (expanded)
// ─────────────────────────────────────────────
async function fetchHN() {
  const queries = [
    { q: 'Show HN MRR', tag: 'story', min_points: 15 },
    { q: 'Show HN revenue', tag: 'story', min_points: 15 },
    { q: 'MRR', tag: 'show_hn', min_points: 10 },
    { q: 'revenue profit launched', tag: 'show_hn', min_points: 10 },
    { q: 'bootstrapped profitable', tag: 'story', min_points: 20 },
    { q: 'side project income', tag: 'story', min_points: 15 },
    { q: 'indie hacker', tag: 'story', min_points: 10 },
    { q: 'launched my SaaS', tag: 'story', min_points: 10 },
    { q: '$10k MRR', tag: 'story', min_points: 5 },
    { q: 'making money side project', tag: 'story', min_points: 10 },
    { q: 'quit job startup', tag: 'story', min_points: 20 },
    { q: 'ramen profitable', tag: 'story', min_points: 5 },
  ];

  const all = [];
  const seen = new Set();

  for (const { q, tag, min_points } of queries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=${tag}&hitsPerPage=50&numericFilters=points>${min_points}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      for (const hit of data.hits || []) {
        const articleUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (seen.has(articleUrl)) continue;
        seen.add(articleUrl);
        all.push({
          source: 'hackernews',
          original_url: articleUrl,
          original_title: hit.title,
          original_content: hit.story_text || '',
          upvotes: hit.points,
          published_at: hit.created_at,
          author_profile_url: hit.author ? `https://news.ycombinator.com/user?id=${hit.author}` : null,
        });
      }
    } catch (err) {
      console.log(`    [HN] Query "${q}" error: ${err.message}`);
    }
    await sleep(300);
  }

  return all;
}

// ─────────────────────────────────────────────
// 2. Reddit Collector (expanded)
// ─────────────────────────────────────────────
async function fetchReddit() {
  const subreddits = [
    { name: 'indiehackers', sort: 'hot' },
    { name: 'indiehackers', sort: 'top', t: 'week' },
    { name: 'entrepreneur', sort: 'hot' },
    { name: 'SideProject', sort: 'hot' },
    { name: 'SaaS', sort: 'hot' },
    { name: 'SaaS', sort: 'top', t: 'week' },
    { name: 'microsaas', sort: 'hot' },
    { name: 'microsaas', sort: 'top', t: 'month' },
    { name: 'startups', sort: 'hot' },
    { name: 'buildinpublic', sort: 'hot' },
    { name: 'nocodesaas', sort: 'hot' },
    { name: 'EntrepreneurRideAlong', sort: 'hot' },
  ];

  const all = [];
  const seen = new Set();

  for (const { name, sort, t } of subreddits) {
    try {
      let url = `https://www.reddit.com/r/${name}/${sort}.json?limit=50`;
      if (t) url += `&t=${t}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'IndieRadarJP/2.0 (research)' },
      });
      if (!res.ok) {
        console.log(`    [Reddit] r/${name}/${sort} failed: ${res.status}`);
        continue;
      }
      const data = await res.json();

      for (const p of data?.data?.children || []) {
        const d = p.data;
        if ((d.score || 0) < 5) continue;
        const permalink = `https://reddit.com${d.permalink}`;
        if (seen.has(permalink)) continue;
        seen.add(permalink);

        all.push({
          source: 'reddit',
          original_url: permalink,
          original_title: d.title,
          original_content: (d.selftext || '').slice(0, 5000),
          upvotes: d.score,
          published_at: new Date(d.created_utc * 1000).toISOString(),
          author_profile_url: d.author ? `https://reddit.com/u/${d.author}` : null,
        });
      }
    } catch (err) {
      console.log(`    [Reddit] r/${name} error: ${err.message}`);
    }
    await sleep(1200); // Reddit rate limit
  }

  return all;
}

// ─────────────────────────────────────────────
// 3. AI Enrichment via Claude API
// ─────────────────────────────────────────────
async function enrichArticle(article) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 6000,
      system: `あなたはPerplexity AIレベルの市場分析能力を持つビジネスアナリストです。
海外のインディーハッカー事例を分析し、グローバル市場での応用可能性を深く掘り下げてください。
データに基づいた具体的な数字、市場規模、成功確率を含めてください。
初心者にも分かりやすく、しかし深い洞察を提供してください。`,
      messages: [{
        role: 'user',
        content: `以下の海外インディーハッカーの投稿を分析し、JSON形式で返してください。
プログラミングやビジネスの初心者にもわかりやすく、具体的に書いてください。

【分析ルール】
ja_summary は合計2500〜3500文字で、以下の7セクションを「## セクション名」形式で構造化してください：

## この事例のポイント（200文字）
- 一言で何がすごいのかを初心者にもわかるように説明
- 具体的な数字を含める

## 何を作ったのか（400文字）
- どんなサービス/プロダクトなのか
- 誰が使うのか（ターゲット）
- 何を解決しているのか
- TAM（潜在市場規模）の推定

## どうやって稼いでいるのか（400文字）
- 収益モデルを詳しく
- 価格設定の具体的な数字とその根拠
- 顧客獲得チャネル

## 成功までのストーリー（500文字）
- 時系列で何があったか
- ターニングポイントと学びポイント

## 技術スタック・使用ツール（300文字）
- 各ツールが何をするものか初心者向けに1行説明
- 代替ツールも1〜2個併記

## あなたの地域での応用可能性（500文字）
- グローバル適用性スコア（★1〜5）
- 主要市場（日本/米国/欧州/東南アジア/インド）での実現可能性
- 最も有望な市場とその理由
- ローカライズのポイント

## この事例から得られるアイデアのヒント（400文字）
- 核心的仕組みの抽象化
- 4つの業界への具体的な応用アイデア

【ja_insightについて】
- 「グローバルで応用するための示唆」として150文字以内
- 市場データを含める

【元記事】
タイトル: ${article.original_title}
ソース: ${article.source}
内容: ${(article.original_content || '').slice(0, 5000)}

【返答形式】必ずこのJSONのみを返してください:
{
  "ja_title": "日本語タイトル（50字以内、数字を含めてキャッチーに）",
  "ja_summary": "## この事例のポイント\\n...\\n\\n## 何を作ったのか\\n...（全7セクション）",
  "ja_insight": "グローバルで応用可能な示唆（150字以内）",
  "ja_difficulty": "Easy or Medium or Hard",
  "business_model": "事業モデル名",
  "mrr_mentioned": null
}`
      }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find(b => b.type === 'text');
  const text = textBlock ? textBlock.text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse Claude JSON response');
  return JSON.parse(match[0]);
}

// ─────────────────────────────────────────────
// 4. Supabase Insert
// ─────────────────────────────────────────────
async function supabaseInsert(article, enriched) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      source: article.source,
      source_type: 'crawler',
      original_url: article.original_url,
      original_title: article.original_title,
      original_content: (article.original_content || '').slice(0, 5000),
      author_profile_url: article.author_profile_url || null,
      ja_title: enriched.ja_title,
      ja_summary: enriched.ja_summary,
      ja_insight: enriched.ja_insight,
      ja_difficulty: enriched.ja_difficulty,
      business_model: enriched.business_model || null,
      mrr_mentioned: enriched.mrr_mentioned,
      upvotes: article.upvotes,
      is_premium: false,
      status: 'published',
      published_at: article.published_at,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function supabaseGetExistingUrls(urls) {
  // Batch URL check
  const batchSize = 100;
  const existing = new Set();

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const filter = batch.map(u => `"${u}"`).join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=original_url&original_url=in.(${encodeURIComponent(filter)})`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      for (const row of data) {
        existing.add(row.original_url);
      }
    }
  }
  return existing;
}

// ─────────────────────────────────────────────
// Main Pipeline
// ─────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(60));
  console.log('  IndieRadar JP — Collection & Enrichment Pipeline');
  console.log('═'.repeat(60));
  console.log();
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no AI/DB)' : 'LIVE'}`);
  console.log(`  Limit: ${LIMIT} articles`);
  console.log(`  Source: ${SOURCE_FILTER}`);
  console.log();

  // Validate config
  if (!DRY_RUN) {
    const issues = validateConfig();
    if (issues.length > 0) {
      console.log('❌ Configuration errors:');
      for (const issue of issues) {
        console.log(`   - ${issue}`);
      }
      console.log();
      console.log('To fix, edit .env.local with your real credentials:');
      console.log('  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
      console.log('  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...');
      console.log('  ANTHROPIC_API_KEY=sk-ant-api03-...');
      console.log();
      console.log('Or run with --dry-run to test fetching without AI/DB.');
      process.exit(1);
    }
    console.log('  ✓ All API keys configured');
  }

  // ── Step 1: Fetch from sources ──
  console.log();
  console.log('─'.repeat(60));
  console.log('  STEP 1: Collecting articles from public APIs');
  console.log('─'.repeat(60));

  let allArticles = [];

  if (SOURCE_FILTER === 'all' || SOURCE_FILTER === 'hn') {
    console.log('\n  [HN] Fetching from Hacker News...');
    const hnArticles = await fetchHN();
    console.log(`  [HN] Collected ${hnArticles.length} unique articles`);
    allArticles.push(...hnArticles);
  }

  if (SOURCE_FILTER === 'all' || SOURCE_FILTER === 'reddit') {
    console.log('\n  [Reddit] Fetching from Reddit...');
    const redditArticles = await fetchReddit();
    console.log(`  [Reddit] Collected ${redditArticles.length} unique articles`);
    allArticles.push(...redditArticles);
  }

  console.log(`\n  Total collected: ${allArticles.length}`);

  // ── Step 2: Score and prioritize ──
  console.log();
  console.log('─'.repeat(60));
  console.log('  STEP 2: Scoring and prioritizing');
  console.log('─'.repeat(60));

  // Score articles by revenue relevance + upvotes
  allArticles = allArticles.map(a => ({
    ...a,
    _score: revenueScore(a.original_title + ' ' + a.original_content) * 3 + Math.min(a.upvotes / 10, 10),
  }));

  // Sort by score (highest first)
  allArticles.sort((a, b) => b._score - a._score);

  // Filter out articles with no meaningful content AND low scores
  allArticles = allArticles.filter(a => {
    const hasContent = a.original_title.length > 10;
    const hasSignal = a._score > 2 || a.upvotes > 50;
    return hasContent && hasSignal;
  });

  console.log(`  After filtering: ${allArticles.length} quality articles`);
  console.log(`  Top 5 by score:`);
  for (const a of allArticles.slice(0, 5)) {
    console.log(`    [score=${a._score.toFixed(1)}, ↑${a.upvotes}] ${a.original_title.slice(0, 70)}`);
  }

  if (DRY_RUN) {
    console.log();
    console.log('═'.repeat(60));
    console.log('  DRY RUN COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Would process: ${Math.min(allArticles.length, LIMIT)} articles`);
    console.log(`  Revenue-relevant: ${allArticles.filter(a => a._score > 5).length}`);
    console.log();
    console.log('  Run without --dry-run to enrich and save to database.');
    return;
  }

  // ── Step 3: Dedup against database ──
  console.log();
  console.log('─'.repeat(60));
  console.log('  STEP 3: Checking for duplicates in database');
  console.log('─'.repeat(60));

  const urls = allArticles.map(a => a.original_url);
  const existingUrls = await supabaseGetExistingUrls(urls);
  const newArticles = allArticles.filter(a => !existingUrls.has(a.original_url));
  console.log(`  Existing in DB: ${existingUrls.size}`);
  console.log(`  New articles: ${newArticles.length}`);

  // Apply limit
  const toProcess = newArticles.slice(0, LIMIT);
  console.log(`  Will process: ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log('\n  No new articles to process. Done!');
    return;
  }

  // ── Step 4: Enrich and save ──
  console.log();
  console.log('─'.repeat(60));
  console.log('  STEP 4: AI Enrichment + Database Save');
  console.log('─'.repeat(60));

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const article = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    process.stdout.write(`  ${progress} "${article.original_title.slice(0, 50)}..." `);

    try {
      // Enrich with Claude
      const enriched = await enrichArticle(article);
      process.stdout.write('✓AI ');

      // Save to Supabase
      await supabaseInsert(article, enriched);
      process.stdout.write('✓DB\n');

      processed++;
      console.log(`         → ${enriched.ja_title?.slice(0, 50)}`);
    } catch (err) {
      process.stdout.write(`✗ ${err.message.slice(0, 80)}\n`);
      errors++;
    }

    // Rate limiting: 2 second between Claude API calls
    if (i < toProcess.length - 1) {
      await sleep(2000);
    }
  }

  // ── Summary ──
  console.log();
  console.log('═'.repeat(60));
  console.log('  PIPELINE COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  Processed: ${processed} / ${toProcess.length}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Success rate: ${((processed / toProcess.length) * 100).toFixed(0)}%`);
  console.log();
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
