import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ko: 'Korean',
  hi: 'Hindi',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
};

export async function POST(req: NextRequest) {
  const { article_id, locale } = await req.json();

  if (!article_id || !locale) {
    return NextResponse.json({ error: 'Missing article_id or locale' }, { status: 400 });
  }

  // Japanese doesn't need translation
  if (locale === 'ja') {
    return NextResponse.json({ error: 'No translation needed for ja' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check cache first (gracefully handle if table doesn't exist)
  try {
    const { data: cached } = await supabase
      .from('article_translations')
      .select('summary, insight')
      .eq('article_id', article_id)
      .eq('locale', locale)
      .single();

    if (cached) {
      return NextResponse.json({
        summary: cached.summary,
        insight: cached.insight,
        cached: true,
      });
    }
  } catch {
    // Table may not exist yet — proceed without cache
  }

  // Fetch the article
  const { data: article } = await supabase
    .from('articles')
    .select('ja_summary, ja_insight')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const targetLang = LOCALE_NAMES[locale] || 'English';
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'placeholder') {
    // Return original content if no API key available
    return NextResponse.json({
      summary: article.ja_summary,
      insight: article.ja_insight,
      translated: false,
    });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Translate the following Japanese article content to ${targetLang}.
Keep the same structure (## headings, bullet points, formatting).
Translate naturally, not literally. Keep technical terms, product names, and dollar amounts as-is.

---SUMMARY---
${article.ja_summary || ''}

---INSIGHT---
${article.ja_insight || ''}

Return your response in this exact format:
---SUMMARY---
(translated summary here)

---INSIGHT---
(translated insight here)`,
        }],
      }),
    });

    if (!res.ok) {
      // API error (likely credit exhaustion) — return original
      return NextResponse.json({
        summary: article.ja_summary,
        insight: article.ja_insight,
        translated: false,
      });
    }

    const data = await res.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
    const text = textBlock ? textBlock.text : '';

    // Parse response
    const summaryMatch = text.match(/---SUMMARY---\s*([\s\S]*?)(?=---INSIGHT---|$)/);
    const insightMatch = text.match(/---INSIGHT---\s*([\s\S]*?)$/);

    const translatedSummary = summaryMatch ? summaryMatch[1].trim() : article.ja_summary;
    const translatedInsight = insightMatch ? insightMatch[1].trim() : article.ja_insight;

    // Cache the translation (ignore errors — table may not exist)
    try {
      await supabase.from('article_translations').upsert({
        article_id,
        locale,
        summary: translatedSummary,
        insight: translatedInsight,
        created_at: new Date().toISOString(),
      }, { onConflict: 'article_id,locale' });
    } catch {
      // Cache table may not exist yet — skip
    }

    return NextResponse.json({
      summary: translatedSummary,
      insight: translatedInsight,
      translated: true,
    });
  } catch {
    // On any error, return original content
    return NextResponse.json({
      summary: article.ja_summary,
      insight: article.ja_insight,
      translated: false,
    });
  }
}
