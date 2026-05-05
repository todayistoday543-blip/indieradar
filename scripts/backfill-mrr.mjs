#!/usr/bin/env node
/**
 * backfill-mrr.mjs
 *
 * Updates existing articles that have mrr_mentioned = null/0
 * Uses Claude API to estimate MRR from the article title + summary.
 * Processes in batches to avoid rate limits.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Batch 10 articles at once to Claude for MRR estimation
async function estimateMrrBatch(articles) {
  const articleList = articles.map((a, i) =>
    `${i+1}. [ID: ${a.id}] タイトル: ${a.ja_title || a.original_title}\n   概要: ${(a.ja_summary || '').slice(0, 200)}`
  ).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `以下の記事リストについて、それぞれの推定月間収益(MRR)をUSD整数で推定してください。

【推定ルール】
- タイトルや概要に具体的な金額がある場合: その数値をUSD/月に変換
- "$X K/mo" → X * 1000
- "$X ARR" → X / 12
- "年商X億円" → X * 100000000 / 12 / 150 (USD換算)
- "月商X万円" → X * 10000 / 150 (USD換算)
- 金額の記載がない場合の推定基準:
  - "ramen profitable" / "paying rent" → 3000
  - "quit job" / "full-time" → 8000
  - "first customer" / "first sale" → 500
  - "hired employee" → 15000
  - "growing fast" / "YC" → 10000
  - プロダクト紹介のみ / 技術デモ → 500
  - 失敗談 / 撤退 → 0のままでOK（ただし記事に学びがあれば100を入れる）
  - オープンソース / 無料ツール → 200

【記事リスト】
${articleList}

【返答形式】JSONの配列のみを返してください:
[{"id": "uuid", "mrr": 数値}, ...]`
      }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find(b => b.type === 'text');
  const text = textBlock ? textBlock.text : '[]';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Failed to parse JSON array');
  return JSON.parse(match[0]);
}

async function updateMrr(id, mrr) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ mrr_mentioned: mrr }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${res.status}: ${text.slice(0, 100)}`);
  }
}

async function main() {
  console.log('════════════════════════════════════════════');
  console.log('  MRR Backfill — Estimating revenue for existing articles');
  console.log('════════════════════════════════════════════\n');

  // Fetch articles without MRR
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/articles?select=id,ja_title,original_title,ja_summary&status=eq.published&or=(mrr_mentioned.is.null,mrr_mentioned.eq.0)&order=upvotes.desc`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const articles = await r.json();
  console.log(`  Found ${articles.length} articles without MRR\n`);

  const BATCH_SIZE = 10;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

    process.stdout.write(`  [Batch ${batchNum}/${totalBatches}] Estimating ${batch.length} articles...`);

    try {
      const estimates = await estimateMrrBatch(batch);

      for (const est of estimates) {
        if (est.mrr && est.mrr > 0) {
          await updateMrr(est.id, est.mrr);
          updated++;
        }
      }
      console.log(` ✓ (${estimates.filter(e => e.mrr > 0).length} updated)`);
    } catch (err) {
      console.log(` ✗ ${err.message.slice(0, 80)}`);
      errors++;
    }

    await sleep(2000); // Rate limit
  }

  console.log('\n════════════════════════════════════════════');
  console.log(`  COMPLETE: ${updated} articles updated, ${errors} errors`);
  console.log('════════════════════════════════════════════');
}

main().catch(console.error);
