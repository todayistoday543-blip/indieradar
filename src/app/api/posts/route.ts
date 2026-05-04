import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { translateAndEnrich } from '@/lib/translator';

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { url, title, content, user_id } = body;

  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Valid URL required' }, { status: 400 });
  }

  const safeTitle = typeof title === 'string' ? title.slice(0, MAX_TITLE_LENGTH) : '';
  const safeContent = typeof content === 'string' ? content.slice(0, MAX_CONTENT_LENGTH) : '';

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user_id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('articles')
    .select('id')
    .eq('source_url', url)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Article already submitted' }, { status: 409 });
  }

  const enriched = await translateAndEnrich({
    original_title: safeTitle || url,
    original_content: safeContent,
    source: 'user',
  });

  const { data, error } = await supabase
    .from('articles')
    .insert({
      source: 'user',
      source_url: url,
      source_type: 'user',
      original_url: url,
      original_title: safeTitle,
      original_content: safeContent,
      author_id: user_id,
      status: 'pending',
      is_premium: false,
      ...enriched,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    article_id: data.id,
  });
}
