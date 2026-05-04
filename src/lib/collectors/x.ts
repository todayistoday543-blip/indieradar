import type { CollectedArticle } from './hackernews';

// X/Twitter search via unofficial endpoints or scraping
// For production, use X API v2 with Bearer Token ($100/month Basic tier)
// MVP approach: use Nitter RSS or search API with rate limiting
export async function fetchXPosts(
  query: string = 'indie hacker MRR launched'
): Promise<CollectedArticle[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    console.warn('X_BEARER_TOKEN not set, skipping X collection');
    return [];
  }

  const url = new URL('https://api.twitter.com/2/tweets/search/recent');
  url.searchParams.set('query', `${query} -is:retweet lang:en`);
  url.searchParams.set('max_results', '20');
  url.searchParams.set(
    'tweet.fields',
    'created_at,public_metrics,author_id,text'
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!res.ok) {
    throw new Error(`X API error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.data) return [];

  return data.data
    .filter(
      (tweet: { public_metrics: { like_count: number } }) =>
        tweet.public_metrics.like_count > 10
    )
    .map(
      (tweet: {
        id: string;
        text: string;
        created_at: string;
        public_metrics: { like_count: number };
      }) => ({
        source: 'x' as const,
        original_url: `https://x.com/i/status/${tweet.id}`,
        original_title: tweet.text.slice(0, 100),
        original_content: tweet.text,
        upvotes: tweet.public_metrics.like_count,
        published_at: tweet.created_at,
      })
    );
}
