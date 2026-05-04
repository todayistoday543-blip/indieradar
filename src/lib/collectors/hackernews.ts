export interface CollectedArticle {
  source: string;
  original_url: string;
  original_title: string;
  original_content: string;
  upvotes: number;
  published_at: string;
}

export async function fetchHNStories(
  query: string = 'MRR side project launched'
): Promise<CollectedArticle[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20&numericFilters=points>50`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);
  const data = await res.json();

  return data.hits.map((hit: Record<string, unknown>) => ({
    source: 'hackernews' as const,
    original_url:
      (hit.url as string) ||
      `https://news.ycombinator.com/item?id=${hit.objectID}`,
    original_title: hit.title as string,
    original_content: (hit.story_text as string) || '',
    upvotes: hit.points as number,
    published_at: hit.created_at as string,
  }));
}
