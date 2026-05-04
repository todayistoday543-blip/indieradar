/**
 * test-collect.mjs
 *
 * Standalone test script to evaluate how many quality articles we can collect
 * from public APIs (no auth needed):
 *   - Hacker News (Algolia API)
 *   - Reddit (public JSON API)
 *   - Product Hunt (public frontend GraphQL)
 *
 * Usage: node scripts/test-collect.mjs
 */

const REVENUE_KEYWORDS = [
  'mrr', 'arr', 'revenue', 'profit', 'income', 'earning',
  '$', 'k/mo', 'k/month', '/month', '/mo', 'monetiz',
  'paying customer', 'subscriber', 'saas', 'bootstrap',
  'ramen profitable', 'break even', 'cash flow'
];

function hasRevenueKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return REVENUE_KEYWORDS.some(kw => lower.includes(kw));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// 1. Hacker News (Algolia API)
// ─────────────────────────────────────────────
async function fetchHN() {
  const queries = [
    'Show HN',
    'MRR',
    'revenue',
    'profit',
    'launched my SaaS',
    'side project',
    'indie hacker',
    'bootstrapped'
  ];

  const allArticles = [];
  const seen = new Set();

  for (const query of queries) {
    try {
      const url = `http://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=50`;
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`  [HN] Query "${query}" failed: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const hits = data.hits || [];
      for (const hit of hits) {
        if (seen.has(hit.objectID)) continue;
        seen.add(hit.objectID);
        allArticles.push({
          source: 'HN',
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          points: hit.points,
          date: hit.created_at,
          query
        });
      }
      console.log(`  [HN] Query "${query}": ${hits.length} hits (${allArticles.length} unique total)`);
    } catch (err) {
      console.log(`  [HN] Query "${query}" error: ${err.message}`);
    }
    await sleep(200); // Be polite
  }

  return allArticles;
}

// ─────────────────────────────────────────────
// 2. Reddit (public JSON API)
// ─────────────────────────────────────────────
async function fetchReddit() {
  const subreddits = [
    'indiehackers',
    'entrepreneur',
    'SideProject',
    'SaaS',
    'microsaas',
    'startups',
    'buildinpublic',
    'nocodesaas'
  ];

  const allArticles = [];

  for (const sub of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=50`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'indie-radar-test/1.0 (research script)'
        }
      });
      if (!res.ok) {
        console.log(`  [Reddit] r/${sub} failed: ${res.status} ${res.statusText}`);
        continue;
      }
      const data = await res.json();
      const posts = data?.data?.children || [];
      for (const post of posts) {
        const d = post.data;
        allArticles.push({
          source: 'Reddit',
          subreddit: sub,
          title: d.title,
          url: `https://reddit.com${d.permalink}`,
          score: d.score,
          date: new Date(d.created_utc * 1000).toISOString(),
          selftext_preview: (d.selftext || '').slice(0, 200)
        });
      }
      console.log(`  [Reddit] r/${sub}: ${posts.length} posts (${allArticles.length} total)`);
    } catch (err) {
      console.log(`  [Reddit] r/${sub} error: ${err.message}`);
    }
    await sleep(1000); // Reddit rate limits are strict
  }

  return allArticles;
}

// ─────────────────────────────────────────────
// 3. Product Hunt (public frontend GraphQL)
// ─────────────────────────────────────────────
async function fetchProductHunt() {
  const allArticles = [];

  // Product Hunt's public frontend GraphQL endpoint
  const graphqlUrl = 'https://www.producthunt.com/frontend/graphql';

  const query = `
    query HomePage {
      homefeed(first: 20) {
        edges {
          node {
            ... on Post {
              id
              name
              tagline
              votesCount
              createdAt
              slug
              url
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'indie-radar-test/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      const text = await res.text();
      console.log(`  [PH] GraphQL failed: ${res.status} - ${text.slice(0, 200)}`);

      // Fallback: try scraping the public page listing
      console.log(`  [PH] Trying alternative approach...`);
      const altRes = await fetch('https://www.producthunt.com/all', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        }
      });
      if (altRes.ok) {
        console.log(`  [PH] Got HTML page (${altRes.status}), but can't easily parse without server rendering`);
      } else {
        console.log(`  [PH] Alternative also failed: ${altRes.status}`);
      }
      return allArticles;
    }

    const data = await res.json();
    const edges = data?.data?.homefeed?.edges || [];
    for (const edge of edges) {
      const node = edge.node;
      if (node && node.name) {
        allArticles.push({
          source: 'ProductHunt',
          title: node.name,
          tagline: node.tagline,
          votes: node.votesCount,
          url: node.url || `https://www.producthunt.com/posts/${node.slug}`,
          date: node.createdAt
        });
      }
    }
    console.log(`  [PH] Got ${allArticles.length} products`);
  } catch (err) {
    console.log(`  [PH] Error: ${err.message}`);
  }

  return allArticles;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('  indie-radar-jp: Public API Data Collection Test');
  console.log('='.repeat(60));
  console.log();

  // Fetch from all sources
  console.log('[1/3] Fetching from Hacker News (Algolia API)...');
  const hnArticles = await fetchHN();
  console.log();

  console.log('[2/3] Fetching from Reddit (public JSON)...');
  const redditArticles = await fetchReddit();
  console.log();

  console.log('[3/3] Fetching from Product Hunt (GraphQL)...');
  const phArticles = await fetchProductHunt();
  console.log();

  // Combine all
  const allArticles = [...hnArticles, ...redditArticles, ...phArticles];

  // Revenue keyword analysis
  const withRevenue = allArticles.filter(a => {
    const text = `${a.title || ''} ${a.tagline || ''} ${a.selftext_preview || ''}`;
    return hasRevenueKeyword(text);
  });

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  console.log('='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log();
  console.log(`Total articles collected: ${allArticles.length}`);
  console.log(`  - Hacker News:   ${hnArticles.length}`);
  console.log(`  - Reddit:        ${redditArticles.length}`);
  console.log(`  - Product Hunt:  ${phArticles.length}`);
  console.log();
  console.log(`Articles with revenue keywords: ${withRevenue.length} (${((withRevenue.length / allArticles.length) * 100).toFixed(1)}%)`);
  console.log();

  // Sample titles from each source
  console.log('-'.repeat(60));
  console.log('  SAMPLE TITLES - Hacker News (top by points)');
  console.log('-'.repeat(60));
  const topHN = [...hnArticles].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
  for (const a of topHN) {
    console.log(`  [${a.points || 0}pts] ${a.title}`);
  }
  console.log();

  console.log('-'.repeat(60));
  console.log('  SAMPLE TITLES - Reddit (top by score)');
  console.log('-'.repeat(60));
  const topReddit = [...redditArticles].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
  for (const a of topReddit) {
    console.log(`  [${a.score || 0} r/${a.subreddit}] ${a.title}`);
  }
  console.log();

  if (phArticles.length > 0) {
    console.log('-'.repeat(60));
    console.log('  SAMPLE TITLES - Product Hunt');
    console.log('-'.repeat(60));
    for (const a of phArticles.slice(0, 10)) {
      console.log(`  [${a.votes || 0} votes] ${a.title} - ${a.tagline}`);
    }
    console.log();
  }

  // Revenue keyword matches sample
  console.log('-'.repeat(60));
  console.log('  SAMPLE - Articles with revenue keywords');
  console.log('-'.repeat(60));
  const revenueExamples = withRevenue.slice(0, 15);
  for (const a of revenueExamples) {
    const src = a.subreddit ? `Reddit/r/${a.subreddit}` : a.source;
    console.log(`  [${src}] ${a.title}`);
  }
  console.log();

  console.log('='.repeat(60));
  console.log('  TEST COMPLETE');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
