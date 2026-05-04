export interface CollectedArticle {
  source: string;
  original_url: string;
  original_title: string;
  original_content: string;
  upvotes: number;
  published_at: string;
  author_profile_url?: string;
}

/**
 * Hacker News — "Show HN" posts + revenue / MRR / launched keywords.
 * Uses the free Algolia HN Search API.
 */
export async function fetchHNStories(): Promise<CollectedArticle[]> {
  const queries = [
    'Show HN',
    'MRR side project launched',
    'revenue indie maker',
  ];

  const all: CollectedArticle[] = [];

  for (const q of queries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20&numericFilters=points>30`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      for (const hit of data.hits ?? []) {
        all.push({
          source: 'hackernews',
          original_url:
            (hit.url as string) ||
            `https://news.ycombinator.com/item?id=${hit.objectID}`,
          original_title: hit.title as string,
          original_content: (hit.story_text as string) || '',
          upvotes: hit.points as number,
          published_at: hit.created_at as string,
          author_profile_url: hit.author
            ? `https://news.ycombinator.com/user?id=${hit.author}`
            : undefined,
        });
      }
    } catch {
      // skip failed query, try next
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return all.filter((a) => {
    if (seen.has(a.original_url)) return false;
    seen.add(a.original_url);
    return true;
  });
}
