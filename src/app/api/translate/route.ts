import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Locales served from pre-stored DB columns (no live Claude call needed)
const DB_TRANSLATED_LOCALES = new Set(['ja', 'es']);

export async function POST(req: NextRequest) {
  const { article_id, locale } = await req.json();

  if (!article_id || !locale) {
    return NextResponse.json({ error: 'Missing article_id or locale' }, { status: 400 });
  }

  // English is the base language — no translation needed
  if (locale === 'en') {
    return NextResponse.json({ error: 'No translation needed' }, { status: 400 });
  }

  // Non-AI-translated locales: return chrome_translate flag so client uses browser translation
  if (!DB_TRANSLATED_LOCALES.has(locale)) {
    return NextResponse.json({ summary: null, insight: null, chrome_translate: true });
  }

  // ja and es: return the pre-stored translation directly from DB columns
  const supabase = createServiceClient();
  const summaryCol = locale === 'ja' ? 'ja_summary' : 'es_summary';
  const insightCol = locale === 'ja' ? 'ja_insight' : 'es_insight';
  const titleCol   = locale === 'ja' ? 'ja_title'   : 'es_title';

  const { data: article } = await supabase
    .from('articles')
    .select(`${summaryCol},${insightCol},${titleCol},en_summary,en_insight`)
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Use the pre-stored translation; fall back to English if translation not yet available
  const summary = (article[summaryCol as keyof typeof article] as string | null)
    || (article['en_summary' as keyof typeof article] as string | null)
    || null;
  const insight = (article[insightCol as keyof typeof article] as string | null)
    || (article['en_insight' as keyof typeof article] as string | null)
    || null;

  return NextResponse.json({
    summary,
    insight,
    cached: true,   // pre-stored in DB — no live generation
    translated: !!summary,
  });
}
