import type { CollectedArticle } from './hackernews';

/**
 * Reddit — 8 subreddits covering indie hacking, SaaS, entrepreneurship.
 * Uses the public JSON endpoint (no auth required).
 */

const SUBREDDITS = [
  'indiehackers',
  'entrepreneur',
  'SideProject',
  'SaaS',
  'microsaas',
  'startups',
  'buildinpublic',
  'nocodesaas',
];

export async function fetchRedditPosts(): Promise<CollectedArticle[]> {
  const all: CollectedArticle[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=25`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'IndieRadarJP/1.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();

      for (const p of data.data?.children ?? []) {
        const d = p.data as Record<string, unknown>;
        if ((d.score as number) < 10) continue;

        all.push({
          source: 'reddit',
          original_url: `https://reddit.com${d.permalink as string}`,
          original_title: d.title as string,
          original_content: (d.selftext as string) || '',
          upvotes: d.score as number,
          published_at: new Date(
            (d.created_utc as number) * 1000
          ).toISOString(),
          author_profile_url: d.author
            ? `https://reddit.com/u/${d.author as string}`
            : undefined,
        });
      }
    } catch {
      // skip failed subreddit
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return all.filter((a) => {
    if (seen.has(a.original_url)) return false;
    seen.add(a.original_url);
    return true;
  });
}
