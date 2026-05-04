import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/articles/[id]/vote
 * Upvote an article. 1 user = 1 vote per article.
 * Body: { user_id: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user_id } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Check existing vote
  const { data: existing } = await supabase
    .from('article_votes')
    .select('id, vote_type')
    .eq('article_id', id)
    .eq('user_id', user_id)
    .single();

  if (existing) {
    // Already voted — remove vote (toggle)
    await supabase
      .from('article_votes')
      .delete()
      .eq('id', existing.id);

    // Decrement count
    await supabase.rpc('decrement_upvote_count', { article_id_param: id });

    return NextResponse.json({ voted: false, action: 'removed' });
  }

  // Insert vote
  const { error } = await supabase.from('article_votes').insert({
    article_id: id,
    user_id,
    vote_type: 'up',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment count
  await supabase.rpc('increment_upvote_count', { article_id_param: id });

  return NextResponse.json({ voted: true, action: 'added' });
}

/**
 * GET /api/articles/[id]/vote?user_id=xxx
 * Check if user has voted
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ voted: false });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('article_votes')
    .select('id')
    .eq('article_id', id)
    .eq('user_id', userId)
    .single();

  return NextResponse.json({ voted: !!data });
}
