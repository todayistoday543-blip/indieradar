#!/usr/bin/env node
/**
 * re-enrich.mjs
 *
 * Re-enriches articles that were inserted with --skip-ai (placeholder content).
 * Fetches them from Supabase, calls Claude API, and updates in-place.
 *
 * Usage:
 *   node scripts/re-enrich.mjs                    (all placeholder articles)
 *   node scripts/re-enrich.mjs --limit 50         (max 50 articles)
 *   node scripts/re-enrich.mjs --source producthunt
 *   node scripts/re-enrich.mjs --concurrency 3    (3 parallel API calls)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      if (!process.env[key]) process.env[key] = val;
    }
    console.log('  ✓ Loaded .env.local');
  } catch { console.log('  ⚠ No .env.local'); }
}

loadEnv();

const args = process.argv.slice(2);
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i+1]) || 999 : 999; })();
const SOURCE = (() => { const i = args.indexOf('--source'); return i !== -1 ? args[i+1] : null; })();
const CONCURRENCY = (() => { const i = args.indexOf('--concurrency'); return i !== -1 ? parseInt(args[i+1]) || 2 : 2; })();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Fetch placeholder articles from DB ───
async function fetchPlaceholderArticles() {
  // Articles inserted with --skip-ai have ja_insight starting with "Source:"
  let url = `${SUPABASE_URL}/rest/v1/articles?select=id,source,original_title,original_content,original_url,upvotes&ja_insight=like.Source:*&order=upvotes.desc&limit=${LIMIT}`;
  if (SOURCE) {
    url += `&source=eq.${SOURCE}`;
  }

  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) throw new Error(`Supabase fetch ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Claude enrichment (same prompt as main pipeline) ───
async function enrichArticle(article) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
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

【mrr_mentionedの重要なルール】
- 記事中に具体的な月間収益（MRR/月収/月商）が書かれている場合: その数値をUSD整数で記入（例: $2.5K/mo → 2500）
- 年間収益（ARR）が書かれている場合: 12で割ってMRRに変換（例: $120K ARR → 10000）
- 総収益のみの場合: 期間で割って月額に変換
- 収益の数字が一切ない場合でも、記事の文脈から推定MRRを算出してください（例: "ramen profitable" → 3000, "quit my job" → 5000, "hired first employee" → 15000, "paying customers" → 1000）
- 絶対にnullを返さないでください。最低でも推定値を入れてください。

【返答形式】必ずこのJSONのみを返してください:
{
  "ja_title": "日本語タイトル（50字以内、数字を含めてキャッチーに）",
  "ja_summary": "## この事例のポイント\\n...\\n\\n## 何を作ったのか\\n...（全7セクション）",
  "ja_insight": "グローバルで応用可能な示唆（150字以内）",
  "ja_difficulty": "Easy or Medium or Hard",
  "business_model": "事業モデル名",
  "mrr_mentioned": 数値（USD月額、整数のみ。推定でも必ず入れる）
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
  if (!match) throw new Error('Failed to parse Claude JSON');
  return JSON.parse(match[0]);
}

// ─── Update article in Supabase ───
async function updateArticle(id, enriched) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      ja_title: enriched.ja_title,
      ja_summary: enriched.ja_summary,
      ja_insight: enriched.ja_insight,
      ja_difficulty: enriched.ja_difficulty,
      business_model: enriched.business_model || null,
      mrr_mentioned: enriched.mrr_mentioned,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase update ${res.status}: ${text.slice(0, 200)}`);
  }
}

// ─── Process batch with concurrency ───
async function processBatch(articles, startIdx) {
  const results = await Promise.allSettled(
    articles.map(async (article, i) => {
      const idx = startIdx + i + 1;
      try {
        const enriched = await enrichArticle(article);
        await updateArticle(article.id, enriched);
        console.log(`  ✓ [${idx}] ${enriched.ja_title?.slice(0, 50)}`);
        return true;
      } catch (err) {
        console.log(`  ✗ [${idx}] ${article.original_title?.slice(0, 40)} — ${err.message.slice(0, 60)}`);
        return false;
      }
    })
  );
  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}

// ─── Main ───
async function main() {
  console.log('═'.repeat(60));
  console.log('  IndieRadar JP — Re-Enrichment Pipeline');
  console.log('═'.repeat(60));
  console.log(`  Source filter: ${SOURCE || 'all'}`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log();

  const articles = await fetchPlaceholderArticles();
  console.log(`  Found ${articles.length} placeholder articles to re-enrich`);

  if (articles.length === 0) {
    console.log('  Nothing to do!');
    return;
  }

  let processed = 0;
  let total = articles.length;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY);
    const success = await processBatch(batch, i);
    processed += success;

    // Rate limit between batches
    if (i + CONCURRENCY < total) {
      await sleep(1000);
    }
  }

  console.log();
  console.log('═'.repeat(60));
  console.log(`  RE-ENRICHMENT COMPLETE: ${processed}/${total} updated`);
  console.log('═'.repeat(60));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
