import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/comments?article_id=xxx
 * Fetch comments for an article, ordered by created_at DESC, limit 50.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get('article_id');

  if (!articleId) {
    return NextResponse.json({ error: 'article_id is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('comments')
    .select('id, article_id, user_id, display_name, body, created_at')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data || [] });
}

/**
 * POST /api/comments
 * Create a new comment.
 * Body: { article_id, user_id, display_name, body }
 */
export async function POST(req: NextRequest) {
  const { article_id, user_id, display_name, body } = await req.json().catch(() => ({}));

  if (!article_id || !user_id || !body) {
    return NextResponse.json(
      { error: 'article_id, user_id, and body are required' },
      { status: 400 }
    );
  }

  if (body.length < 1 || body.length > 2000) {
    return NextResponse.json(
      { error: 'body must be 1-2000 characters' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      article_id,
      user_id,
      display_name: display_name || 'Anonymous',
      body: body.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}

/**
 * DELETE /api/comments?id=xxx&user_id=yyy
 * Delete a comment (only if the user owns it).
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('user_id');

  if (!id || !userId) {
    return NextResponse.json(
      { error: 'id and user_id are required' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('comments')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  if (existing.user_id !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
