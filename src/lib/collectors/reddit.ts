import type { CollectedArticle } from './hackernews';

export async function fetchRedditPosts(
  subreddit: string = 'indiehackers'
): Promise<CollectedArticle[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'IndieRadarJP/1.0' },
  });

  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);
  const data = await res.json();

  return data.data.children
    .filter((p: { data: { score: number } }) => p.data.score > 50)
    .map((p: { data: Record<string, unknown> }) => ({
      source: 'reddit' as const,
      original_url: `https://reddit.com${p.data.permalink}`,
      original_title: p.data.title as string,
      original_content: (p.data.selftext as string) || '',
      upvotes: p.data.score as number,
      published_at: new Date(
        (p.data.created_utc as number) * 1000
      ).toISOString(),
    }));
}
