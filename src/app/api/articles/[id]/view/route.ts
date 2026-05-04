import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/articles/[id]/view
 * Increments view_count for an article.
 * Uses a session-based dedup: same session_id won't count within 1 hour.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session_id } = await req.json().catch(() => ({ session_id: null }));

  const supabase = createServiceClient();

  // Session-based dedup: check if this session viewed recently
  if (session_id) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentView } = await supabase
      .from('article_views')
      .select('id')
      .eq('article_id', id)
      .eq('session_id', session_id)
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (recentView && recentView.length > 0) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    // Record this view
    await supabase.from('article_views').insert({
      article_id: id,
      session_id,
    });
  }

  // Increment view_count using RPC
  const { error } = await supabase.rpc('increment_view_count', {
    article_id_param: id,
  });

  if (error) {
    // Fallback: read current count and update
    const { data: current } = await supabase
      .from('articles')
      .select('view_count')
      .eq('id', id)
      .single();

    await supabase
      .from('articles')
      .update({ view_count: ((current?.view_count as number) || 0) + 1 })
      .eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
