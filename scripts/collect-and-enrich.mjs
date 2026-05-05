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
 *   node scripts/collect-and-enrich.mjs --source producthunt (only PH)
 *   node scripts/collect-and-enrich.mjs --source indiehackers (only IH)
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
const SKIP_AI = args.includes('--skip-ai');
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
  if (!SKIP_AI && (!ANTHROPIC_KEY || ANTHROPIC_KEY.includes('your-key') || ANTHROPIC_KEY === 'placeholder')) {
    issues.push('ANTHROPIC_API_KEY is not set (has placeholder value). Use --skip-ai to skip AI enrichment.');
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

// High-value: explicit dollar amounts in title
const DOLLAR_PATTERN = /\$[\d,.]+[kK]?(?:\/mo|\/month| MRR| ARR| revenue)?/;
const MRR_PATTERN = /[\d,.]+[kK]?\s*(?:MRR|ARR|\/mo|\/month|per month|a month)/i;

function revenueScore(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = REVENUE_KEYWORDS.filter(kw => lower.includes(kw)).length;
  // Massive boost for explicit dollar amounts
  if (DOLLAR_PATTERN.test(text)) score += 10;
  if (MRR_PATTERN.test(text)) score += 8;
  return score;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// 1. Hacker News Collector (expanded)
// ─────────────────────────────────────────────
async function fetchHN() {
  const queries = [
    // Explicit revenue mentions
    { q: 'Show HN MRR', tag: 'story', min_points: 10 },
    { q: 'Show HN revenue', tag: 'story', min_points: 10 },
    { q: 'MRR', tag: 'show_hn', min_points: 5 },
    { q: '$1k MRR', tag: 'story', min_points: 5 },
    { q: '$5k MRR', tag: 'story', min_points: 5 },
    { q: '$10k MRR', tag: 'story', min_points: 5 },
    { q: '$20k MRR', tag: 'story', min_points: 5 },
    { q: '$50k MRR', tag: 'story', min_points: 5 },
    { q: '$100k ARR', tag: 'story', min_points: 5 },
    { q: 'revenue profit launched', tag: 'show_hn', min_points: 8 },
    { q: 'first paying customer', tag: 'story', min_points: 5 },
    { q: 'hit revenue milestone', tag: 'story', min_points: 5 },
    // Growth stories
    { q: 'bootstrapped profitable', tag: 'story', min_points: 15 },
    { q: 'side project income', tag: 'story', min_points: 10 },
    { q: 'making money side project', tag: 'story', min_points: 8 },
    { q: 'passive income', tag: 'story', min_points: 10 },
    { q: 'ramen profitable', tag: 'story', min_points: 5 },
    { q: 'quit job startup revenue', tag: 'story', min_points: 15 },
    { q: 'SaaS launched customers', tag: 'story', min_points: 8 },
    { q: 'indie hacker revenue', tag: 'story', min_points: 5 },
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
    // Revenue-focused communities
    { name: 'indiehackers', sort: 'hot' },
    { name: 'indiehackers', sort: 'top', t: 'week' },
    { name: 'indiehackers', sort: 'top', t: 'month' },
    { name: 'SaaS', sort: 'hot' },
    { name: 'SaaS', sort: 'top', t: 'week' },
    { name: 'SaaS', sort: 'top', t: 'month' },
    { name: 'microsaas', sort: 'hot' },
    { name: 'microsaas', sort: 'top', t: 'month' },
    { name: 'microsaas', sort: 'top', t: 'year' },
    { name: 'EntrepreneurRideAlong', sort: 'hot' },
    { name: 'EntrepreneurRideAlong', sort: 'top', t: 'month' },
    { name: 'buildinpublic', sort: 'hot' },
    { name: 'buildinpublic', sort: 'top', t: 'month' },
    // Broader but revenue-rich communities
    { name: 'entrepreneur', sort: 'hot' },
    { name: 'entrepreneur', sort: 'top', t: 'week' },
    { name: 'SideProject', sort: 'hot' },
    { name: 'SideProject', sort: 'top', t: 'month' },
    { name: 'startups', sort: 'hot' },
    { name: 'startups', sort: 'top', t: 'month' },
    { name: 'nocodesaas', sort: 'hot' },
    { name: 'nocodesaas', sort: 'top', t: 'month' },
    // Additional revenue-evidence communities
    { name: 'juststart', sort: 'top', t: 'month' },
    { name: 'passive_income', sort: 'hot' },
    { name: 'passive_income', sort: 'top', t: 'month' },
    { name: 'sweatystartup', sort: 'hot' },
    { name: 'sweatystartup', sort: 'top', t: 'month' },
    { name: 'Affiliatemarketing', sort: 'top', t: 'month' },
    { name: 'ecommerce', sort: 'top', t: 'month' },
    { name: 'digitalnomad', sort: 'top', t: 'month' },
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
// 3. Product Hunt Collector
// ─────────────────────────────────────────────
async function fetchProductHunt() {
  const all = [];
  const seen = new Set();

  // Source 1: PH Atom RSS feed (public, reliable)
  console.log('    [PH] Fetching Atom feed...');
  try {
    const res = await fetch('https://www.producthunt.com/feed', {
      headers: { 'User-Agent': 'IndieRadarJP/2.0 (research)' },
    });
    if (res.ok) {
      const xml = await res.text();
      // Parse Atom entries with regex (no XML parser needed)
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      for (const entry of entries) {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
        const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
        const authorMatch = entry.match(/<name>([\s\S]*?)<\/name>/);
        const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const phUrl = linkMatch ? linkMatch[1] : '';
        if (!title || !phUrl || seen.has(phUrl)) continue;
        seen.add(phUrl);

        // Extract tagline from content HTML
        const tagline = contentMatch
          ? contentMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
              .replace(/<[^>]+>/g, '').trim().split('\n')[0]?.trim() || ''
          : '';

        // Extract the actual product link from content
        const productLinkMatch = contentMatch?.[1]?.match(/href="(https:\/\/www\.producthunt\.com\/r\/[^"]+)"/);
        const productLink = productLinkMatch ? productLinkMatch[1].replace(/&amp;/g, '&') : '';

        all.push({
          source: 'producthunt',
          original_url: productLink || phUrl,
          original_title: tagline ? `${title} — ${tagline}` : title,
          original_content: tagline,
          upvotes: 0, // RSS doesn't include vote counts
          published_at: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
          author_profile_url: authorMatch
            ? `https://www.producthunt.com/@${authorMatch[1].trim().toLowerCase().replace(/\s+/g, '')}`
            : null,
        });
      }
      console.log(`    [PH] Feed: ${all.length} products`);
    }
  } catch (err) {
    console.log(`    [PH] Feed error: ${err.message.slice(0, 60)}`);
  }

  // Source 2: HN posts about Product Hunt launches
  console.log('    [PH] Fetching HN cross-references...');
  const hnQueries = [
    'Product Hunt launch',
    'launched Product Hunt',
    'Show HN product hunt',
    'product hunt top',
  ];
  for (const q of hnQueries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=30&numericFilters=points>15`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const hit of data.hits || []) {
        const articleUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (seen.has(articleUrl)) continue;
        seen.add(articleUrl);
        all.push({
          source: 'producthunt',
          original_url: articleUrl,
          original_title: hit.title,
          original_content: hit.story_text || '',
          upvotes: hit.points,
          published_at: hit.created_at,
          author_profile_url: hit.author ? `https://news.ycombinator.com/user?id=${hit.author}` : null,
        });
      }
    } catch (err) {
      console.log(`    [PH] HN query "${q}" error: ${err.message.slice(0, 60)}`);
    }
    await sleep(400);
  }
  console.log(`    [PH] After HN: ${all.length} total`);

  // Source 3: Reddit posts about Product Hunt
  console.log('    [PH] Fetching Reddit cross-references...');
  const redditQueries = [
    '"product hunt" launched revenue',
    '"product hunt" MRR saas',
    '"producthunt.com" launched',
    'product hunt launch strategy',
  ];
  for (const q of redditQueries) {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=top&t=year&limit=25`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'IndieRadarJP/2.0 (research)' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of data?.data?.children || []) {
        const d = p.data;
        if ((d.score || 0) < 5) continue;
        const postUrl = d.url || `https://reddit.com${d.permalink}`;
        if (seen.has(postUrl)) continue;
        seen.add(postUrl);
        all.push({
          source: 'producthunt',
          original_url: postUrl,
          original_title: d.title,
          original_content: (d.selftext || '').slice(0, 5000),
          upvotes: d.score,
          published_at: new Date(d.created_utc * 1000).toISOString(),
          author_profile_url: d.author ? `https://reddit.com/u/${d.author}` : null,
        });
      }
    } catch (err) {
      console.log(`    [PH] Reddit query error: ${err.message.slice(0, 60)}`);
    }
    await sleep(1200);
  }
  console.log(`    [PH] After Reddit: ${all.length} total`);

  return all;
}

// ─────────────────────────────────────────────
// 4. IndieHackers Collector
// ─────────────────────────────────────────────
async function fetchIndieHackers() {
  const all = [];
  const seen = new Set();

  // IndieHackers has revenue-tagged posts and milestones
  // Try their website endpoints
  const endpoints = [
    // Top posts
    { url: 'https://www.indiehackers.com/posts?sort=top', label: 'top posts' },
    { url: 'https://www.indiehackers.com/posts?sort=top&timeframe=week', label: 'top week' },
    { url: 'https://www.indiehackers.com/posts?sort=top&timeframe=month', label: 'top month' },
  ];

  // Try IH's API endpoints
  const ihApiEndpoints = [
    'https://www.indiehackers.com/api/posts?sort=top&page=1',
    'https://www.indiehackers.com/api/posts?sort=top&page=2',
    'https://www.indiehackers.com/api/posts?sort=hot&page=1',
    'https://www.indiehackers.com/api/milestones?sort=recent&page=1',
    'https://www.indiehackers.com/api/milestones?sort=recent&page=2',
  ];

  for (const endpoint of ihApiEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IndieRadarJP/2.0)',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) {
        console.log(`    [IH] ${endpoint.split('?')[1]} → ${res.status}`);
        continue;
      }
      const data = await res.json();
      const posts = data?.posts || data?.milestones || data?.data || [];

      for (const post of (Array.isArray(posts) ? posts : [])) {
        const ihUrl = post.url
          ? (post.url.startsWith('http') ? post.url : `https://www.indiehackers.com${post.url}`)
          : `https://www.indiehackers.com/post/${post.id || post._id}`;
        if (seen.has(ihUrl)) continue;
        seen.add(ihUrl);

        const title = post.title || post.body?.slice(0, 100) || '';
        const content = post.body || post.description || post.text || '';
        const votes = post.votesCount || post.score || post.upvotes || 0;

        if (title.length < 5 && content.length < 20) continue;

        all.push({
          source: 'indiehackers',
          original_url: ihUrl,
          original_title: title,
          original_content: content.slice(0, 5000),
          upvotes: votes,
          published_at: post.createdAt || post.created_at || new Date().toISOString(),
          author_profile_url: post.user?.username
            ? `https://www.indiehackers.com/${post.user.username}`
            : (post.author?.username
              ? `https://www.indiehackers.com/${post.author.username}`
              : null),
        });
      }
      console.log(`    [IH] ${endpoint.split('/api/')[1]?.split('?')[0]}: found ${posts.length || 0}`);
    } catch (err) {
      console.log(`    [IH] API error: ${err.message.slice(0, 60)}`);
    }
    await sleep(1500);
  }

  // Fallback: scrape the HTML pages for __NEXT_DATA__ or embedded JSON
  if (all.length === 0) {
    console.log('    [IH] API failed, trying HTML scraping...');
    for (const { url, label } of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
          },
        });
        if (!res.ok) continue;
        const html = await res.text();

        // Try __NEXT_DATA__
        const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nextMatch) {
          try {
            const nd = JSON.parse(nextMatch[1]);
            const posts = nd?.props?.pageProps?.posts || [];
            for (const post of posts) {
              const ihUrl = `https://www.indiehackers.com/post/${post.id || post.slug}`;
              if (seen.has(ihUrl)) continue;
              seen.add(ihUrl);
              all.push({
                source: 'indiehackers',
                original_url: ihUrl,
                original_title: post.title || '',
                original_content: (post.body || '').slice(0, 5000),
                upvotes: post.votesCount || 0,
                published_at: post.createdAt || new Date().toISOString(),
                author_profile_url: post.user?.username
                  ? `https://www.indiehackers.com/${post.user.username}`
                  : null,
              });
            }
          } catch { /* parse error */ }
        }

        // Try window.__DATA__ pattern
        const dataMatch = html.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
        if (dataMatch) {
          try {
            const wd = JSON.parse(dataMatch[1]);
            const posts = wd?.posts || [];
            for (const post of posts) {
              const ihUrl = `https://www.indiehackers.com/post/${post.id}`;
              if (seen.has(ihUrl)) continue;
              seen.add(ihUrl);
              all.push({
                source: 'indiehackers',
                original_url: ihUrl,
                original_title: post.title || '',
                original_content: (post.body || '').slice(0, 5000),
                upvotes: post.votesCount || 0,
                published_at: post.createdAt || new Date().toISOString(),
                author_profile_url: null,
              });
            }
          } catch { /* parse error */ }
        }

        console.log(`    [IH] ${label}: scraped ${all.length} so far`);
      } catch (err) {
        console.log(`    [IH] Scrape ${label} error: ${err.message.slice(0, 60)}`);
      }
      await sleep(2000);
    }
  }

  // Final fallback: fetch from r/indiehackers on Reddit (which mirrors IH content)
  if (all.length === 0) {
    console.log('    [IH] No direct data, fetching from Reddit r/indiehackers with IH tag...');
    try {
      const searchQueries = [
        'site:indiehackers.com revenue',
        'site:indiehackers.com MRR',
        'site:indiehackers.com milestone',
        'indiehackers revenue milestone MRR',
      ];
      for (const q of searchQueries) {
        const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=top&t=month&limit=25`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'IndieRadarJP/2.0 (research)' },
        });
        if (!res.ok) continue;
        const data = await res.json();
        for (const p of data?.data?.children || []) {
          const d = p.data;
          if ((d.score || 0) < 3) continue;
          const postUrl = d.url || `https://reddit.com${d.permalink}`;
          if (seen.has(postUrl)) continue;
          seen.add(postUrl);
          all.push({
            source: 'indiehackers',
            original_url: postUrl,
            original_title: d.title,
            original_content: (d.selftext || '').slice(0, 5000),
            upvotes: d.score,
            published_at: new Date(d.created_utc * 1000).toISOString(),
            author_profile_url: d.author ? `https://reddit.com/u/${d.author}` : null,
          });
        }
        await sleep(1200);
      }
    } catch (err) {
      console.log(`    [IH] Reddit fallback error: ${err.message.slice(0, 60)}`);
    }
  }

  return all;
}

// ─────────────────────────────────────────────
// 5. AI Enrichment via Claude API
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
  if (!match) throw new Error('Failed to parse Claude JSON response');
  return JSON.parse(match[0]);
}

// ─────────────────────────────────────────────
// 3b. Basic enrichment (no AI) — fallback when API unavailable
// ─────────────────────────────────────────────
function basicEnrichment(article) {
  const title = article.original_title || 'Untitled';
  const content = article.original_content || '';

  // Extract dollar amounts for MRR
  const dollarMatch = content.match(/\$[\d,.]+[kK]?/);
  const mrrMatch = content.match(/([\d,.]+)\s*[kK]?\s*(?:MRR|\/mo|\/month|per month)/i);
  let mrr = 0;
  if (mrrMatch) {
    mrr = parseFloat(mrrMatch[1].replace(/,/g, ''));
    if (/[kK]/.test(mrrMatch[0])) mrr *= 1000;
  } else if (dollarMatch) {
    const val = parseFloat(dollarMatch[0].replace(/[\$,]/g, ''));
    mrr = /[kK]/.test(dollarMatch[0]) ? val * 1000 : val;
  }
  if (mrr === 0) mrr = 1000; // default estimate

  // Determine difficulty from content
  let difficulty = 'Medium';
  const lower = content.toLowerCase();
  if (lower.includes('easy') || lower.includes('simple') || lower.includes('no-code') || lower.includes('nocode')) {
    difficulty = 'Easy';
  } else if (lower.includes('complex') || lower.includes('machine learning') || lower.includes('ml model') || lower.includes('infrastructure')) {
    difficulty = 'Hard';
  }

  // Detect business model
  let businessModel = 'SaaS';
  if (lower.includes('marketplace')) businessModel = 'Marketplace';
  else if (lower.includes('newsletter') || lower.includes('subscription')) businessModel = 'Subscription';
  else if (lower.includes('e-commerce') || lower.includes('ecommerce') || lower.includes('store')) businessModel = 'E-commerce';
  else if (lower.includes('api')) businessModel = 'API';
  else if (lower.includes('agency') || lower.includes('consulting')) businessModel = 'Services';
  else if (lower.includes('course') || lower.includes('ebook') || lower.includes('template')) businessModel = 'Digital Products';

  return {
    ja_title: title, // Keep English title (users can see original + on-demand translate)
    ja_summary: `## この事例のポイント\n${title}\n\n## 元の内容\n${content.slice(0, 1500) || '（原文を参照してください）'}`,
    ja_insight: `Source: ${article.source}. Revenue signal detected.`,
    ja_difficulty: difficulty,
    business_model: businessModel,
    mrr_mentioned: Math.round(mrr),
  };
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
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no AI/DB)' : SKIP_AI ? 'LIVE (skip AI)' : 'LIVE'}`);
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

  if (SOURCE_FILTER === 'all' || SOURCE_FILTER === 'producthunt' || SOURCE_FILTER === 'ph') {
    console.log('\n  [PH] Fetching from Product Hunt...');
    const phArticles = await fetchProductHunt();
    console.log(`  [PH] Collected ${phArticles.length} unique products`);
    allArticles.push(...phArticles);
  }

  if (SOURCE_FILTER === 'all' || SOURCE_FILTER === 'indiehackers' || SOURCE_FILTER === 'ih') {
    console.log('\n  [IH] Fetching from IndieHackers...');
    const ihArticles = await fetchIndieHackers();
    console.log(`  [IH] Collected ${ihArticles.length} unique articles`);
    allArticles.push(...ihArticles);
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
      // Enrich with Claude (or basic fallback)
      let enriched;
      if (SKIP_AI) {
        enriched = basicEnrichment(article);
        process.stdout.write('⊘AI ');
      } else {
        enriched = await enrichArticle(article);
        process.stdout.write('✓AI ');
      }

      // Save to Supabase
      await supabaseInsert(article, enriched);
      process.stdout.write('✓DB\n');

      processed++;
      console.log(`         → ${enriched.ja_title?.slice(0, 50)}`);
    } catch (err) {
      process.stdout.write(`✗ ${err.message.slice(0, 80)}\n`);
      errors++;
    }

    // Rate limiting: 2 second between Claude API calls (skip when no AI)
    if (!SKIP_AI && i < toProcess.length - 1) {
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
