import type { CollectedArticle } from './hackernews';

/**
 * Indie Hackers — scrapes the public feed for interviews & revenue posts.
 * IH doesn't have a public API so we parse the HTML from the feed page.
 * If the page structure changes, this collector returns an empty array gracefully.
 */
export async function fetchIHPosts(): Promise<CollectedArticle[]> {
  try {
    // The IH homepage lists top posts in a <script> JSON blob
    const res = await fetch('https://www.indiehackers.com/', {
      headers: {
        'User-Agent': 'NicheHunt/1.0 (article aggregator)',
        Accept: 'text/html',
      },
    });

    if (!res.ok) return [];
    const html = await res.text();

    // Try to extract the __NEXT_DATA__ or similar JSON payload
    const jsonMatch = html.match(
      /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );

    if (jsonMatch) {
      return parseNextDataPayload(jsonMatch[1]);
    }

    // Fallback: extract articles from meta / structured data
    return parseFromMeta(html);
  } catch {
    return [];
  }
}

function parseNextDataPayload(json: string): CollectedArticle[] {
  try {
    const data = JSON.parse(json);
    const posts =
      data?.props?.pageProps?.posts ??
      data?.props?.pageProps?.feed ??
      [];

    return posts.slice(0, 20).map(
      (post: Record<string, unknown>) => ({
        source: 'indiehackers' as const,
        original_url:
          (post.url as string) ||
          `https://www.indiehackers.com/post/${post.slug ?? post.id}`,
        original_title: (post.title as string) || 'Untitled',
        original_content: (post.body as string) || (post.description as string) || '',
        upvotes: (post.score as number) || (post.votesCount as number) || 0,
        published_at:
          (post.createdAt as string) ||
          (post.publishedAt as string) ||
          new Date().toISOString(),
        author_profile_url: post.author
          ? `https://www.indiehackers.com/${(post.author as Record<string, string>).username || ''}`
          : undefined,
      })
    );
  } catch {
    return [];
  }
}

function parseFromMeta(html: string): CollectedArticle[] {
  // Extract <a> with article-like hrefs as a last resort
  const regex =
    /href="(\/post\/[^"]+)"[^>]*>([^<]+)/gi;
  const results: CollectedArticle[] = [];
  let m;

  while ((m = regex.exec(html)) !== null && results.length < 20) {
    results.push({
      source: 'indiehackers',
      original_url: `https://www.indiehackers.com${m[1]}`,
      original_title: m[2].trim(),
      original_content: '',
      upvotes: 0,
      published_at: new Date().toISOString(),
    });
  }

  return results;
}
