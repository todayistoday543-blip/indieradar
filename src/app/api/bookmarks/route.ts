import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookmarks?user_id=xxx&article_id=yyy
 *   → { bookmarked: boolean }
 *
 * GET /api/bookmarks?list=true&user_id=xxx
 *   → { bookmarks: [...] } with joined article details
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  const articleId = searchParams.get('article_id');
  const list = searchParams.get('list');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // List all bookmarks for a user
  if (list === 'true') {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id, article_id, created_at, articles(id, source, original_title, en_title, en_summary, en_insight, ja_title, ja_summary, ja_insight, es_title, es_summary, es_insight, ja_difficulty, business_model, mrr_mentioned, upvotes, is_premium, original_url, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarks: data || [] });
  }

  // Check single bookmark
  if (!articleId) {
    return NextResponse.json({ error: 'article_id is required' }, { status: 400 });
  }

  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .single();

  return NextResponse.json({ bookmarked: !!data });
}

/**
 * POST /api/bookmarks
 * Toggle bookmark for an article.
 * Body: { user_id, article_id }
 * Returns: { action: 'added' | 'removed' }
 */
export async function POST(req: NextRequest) {
  const { user_id, article_id } = await req.json().catch(() => ({}));

  if (!user_id || !article_id) {
    return NextResponse.json(
      { error: 'user_id and article_id are required' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user_id)
    .eq('article_id', article_id)
    .single();

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: 'removed' });
  }

  // Add bookmark
  const { error } = await supabase
    .from('bookmarks')
    .insert({ user_id, article_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ action: 'added' }, { status: 201 });
}
