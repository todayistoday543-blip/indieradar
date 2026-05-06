import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro: allow up to 60s for translation

// These locales get AI translation from the English base; others use Chrome translation
const AI_TRANSLATED_LOCALES: Record<string, string> = {
  ja: 'Japanese',
  es: 'Spanish',
};

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

export async function POST(req: NextRequest) {
  const { article_id, locale } = await req.json();

  if (!article_id || !locale) {
    return NextResponse.json({ error: 'Missing article_id or locale' }, { status: 400 });
  }

  // English is the base language — no translation needed
  if (locale === 'en') {
    return NextResponse.json({ error: 'No translation needed' }, { status: 400 });
  }

  // Non-AI-translated locales: return null so client falls back to Chrome translation
  if (!AI_TRANSLATED_LOCALES[locale]) {
    return NextResponse.json({ summary: null, insight: null, chrome_translate: true });
  }

  const supabase = createServiceClient();

  // Check cache first
  try {
    const { data: cached } = await supabase
      .from('article_translations')
      .select('summary, insight')
      .eq('article_id', article_id)
      .eq('locale', locale)
      .single();

    if (cached?.summary) {
      return NextResponse.json({ summary: cached.summary, insight: cached.insight, cached: true });
    }
  } catch {
    // Table may not exist yet — proceed without cache
  }

  // Fetch the Japanese source article
  const { data: article } = await supabase
    .from('articles')
    .select('ja_summary, ja_insight')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const targetLang = AI_TRANSLATED_LOCALES[locale];
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ summary: null, insight: null, translated: false });
  }

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Translate the following English indie hacker case study to ${targetLang}.

Rules:
- Keep the same structure (## headings, formatting)
- Translate naturally, not word-for-word
- Keep technical terms, product names, URLs, and dollar/yen amounts as-is
- Keep "Easy/Medium/Hard" difficulty labels as-is

---SUMMARY---
${article.ja_summary || ''}

---INSIGHT---
${article.ja_insight || ''}

Return in this exact format (no extra text):
---SUMMARY---
(translated summary)

---INSIGHT---
(translated insight)`,
      }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    const summaryMatch = text.match(/---SUMMARY---\s*([\s\S]*?)(?=---INSIGHT---|$)/);
    const insightMatch = text.match(/---INSIGHT---\s*([\s\S]*?)$/);

    const translatedSummary = summaryMatch ? summaryMatch[1].trim() : null;
    const translatedInsight = insightMatch ? insightMatch[1].trim() : null;

    // Cache for next request (best-effort)
    if (translatedSummary) {
      try {
        await supabase.from('article_translations').upsert({
          article_id,
          locale,
          summary: translatedSummary,
          insight: translatedInsight,
          created_at: new Date().toISOString(),
        }, { onConflict: 'article_id,locale' });
      } catch { /* skip if table doesn't exist */ }
    }

    return NextResponse.json({
      summary: translatedSummary,
      insight: translatedInsight,
      translated: true,
    });
  } catch (err) {
    console.error('Translation error:', err);
    return NextResponse.json({ summary: null, insight: null, translated: false });
  }
}
