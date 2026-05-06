import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { translateAndEnrich } from '@/lib/translator';

export const dynamic = 'force-dynamic';

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

  // Explicitly pick only DB columns from enriched — do NOT spread the whole object
  // because TranslationResult includes `is_business_case` which is not a DB column.
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
      // English base
      en_title:      enriched.en_title,
      en_summary:    enriched.en_summary,
      en_insight:    enriched.en_insight,
      // Japanese (意訳)
      ja_title:      enriched.ja_title,
      ja_summary:    enriched.ja_summary,
      ja_insight:    enriched.ja_insight,
      // Spanish (意訳)
      es_title:      enriched.es_title,
      es_summary:    enriched.es_summary,
      es_insight:    enriched.es_insight,
      ja_difficulty: enriched.ja_difficulty,
      business_model: enriched.business_model || null,
      mrr_mentioned:  enriched.mrr_mentioned,
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
