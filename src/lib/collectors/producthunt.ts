import type { CollectedArticle } from './hackernews';

/**
 * Product Hunt — scrapes the public homepage API (no auth token needed).
 * Falls back to a simpler HTML-free approach using the public feed.
 */
export async function fetchPHPosts(): Promise<CollectedArticle[]> {
  // Product Hunt's public /posts endpoint returns recent top posts.
  // If the official GraphQL API token is available, use that; otherwise
  // scrape the public REST-like endpoint.
  const token = process.env.PH_ACCESS_TOKEN;

  if (token) {
    return fetchViaPHGraphQL(token);
  }

  // Public RSS-like approach via the website's JSON feed
  return fetchViaPHWeb();
}

/* ── GraphQL path (when PH token is available) ──────────────── */

async function fetchViaPHGraphQL(token: string): Promise<CollectedArticle[]> {
  const query = `{
    posts(first: 20, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          website
          votesCount
          createdAt
          makers { username }
        }
      }
    }
  }`;

  const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`PH GraphQL API error: ${res.status}`);
  const data = await res.json();

  return (data.data?.posts?.edges ?? []).map(
    ({ node }: { node: Record<string, unknown> }) => {
      const makers = node.makers as Array<{ username: string }> | undefined;
      return {
        source: 'producthunt' as const,
        original_url: (node.website as string) || (node.url as string),
        original_title: `${node.name} — ${node.tagline}`,
        original_content: (node.description as string) || '',
        upvotes: node.votesCount as number,
        published_at: node.createdAt as string,
        author_profile_url: makers?.[0]
          ? `https://www.producthunt.com/@${makers[0].username}`
          : undefined,
      };
    }
  );
}

/* ── Public web scrape fallback (no token) ──────────────────── */

async function fetchViaPHWeb(): Promise<CollectedArticle[]> {
  try {
    // The PH front-page JSON (unofficial but stable endpoint)
    const res = await fetch(
      'https://www.producthunt.com/frontend/graphql',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'HomePage',
          variables: {},
          query: `query HomePage {
            homefeed(first: 20) {
              edges {
                node {
                  ... on Post {
                    id
                    name
                    tagline
                    description
                    url
                    website
                    votesCount
                    createdAt
                  }
                }
              }
            }
          }`,
        }),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.data?.homefeed?.edges ?? [])
      .filter((e: Record<string, unknown>) => e.node)
      .map(({ node }: { node: Record<string, unknown> }) => ({
        source: 'producthunt' as const,
        original_url: (node.website as string) || (node.url as string),
        original_title: `${node.name} — ${node.tagline}`,
        original_content: (node.description as string) || '',
        upvotes: (node.votesCount as number) || 0,
        published_at: (node.createdAt as string) || new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}
