import type { CollectedArticle } from './hackernews';

export async function fetchPHPosts(
  token: string
): Promise<CollectedArticle[]> {
  const query = `{
    posts(first: 20, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          votesCount
          createdAt
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

  if (!res.ok) throw new Error(`ProductHunt API error: ${res.status}`);
  const data = await res.json();

  return data.data.posts.edges.map(
    ({ node }: { node: Record<string, unknown> }) => ({
      source: 'producthunt' as const,
      original_url: node.url as string,
      original_title: `${node.name} - ${node.tagline}`,
      original_content: (node.description as string) || '',
      upvotes: node.votesCount as number,
      published_at: node.createdAt as string,
    })
  );
}
