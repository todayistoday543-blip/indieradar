import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_SIZE = 40;

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

async function translateToSpanish(en: {
  en_title: string;
  en_summary: string;
  en_insight: string;
}): Promise<{ es_title: string; es_summary: string; es_insight: string }> {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 6000,
    system: `You are a professional Spanish translator specializing in Latin American localization.
Your translations are 意訳 (contextual/adaptive) — feel completely natural to native Spanish speakers.
- Preserve exact ## section headings structure (translated naturally)
- Keep product names, URLs, dollar amounts, technical terms natural
- Use Latin American Spanish conventions
- Keep "Easy/Medium/Hard" labels as-is (they are metadata values, not prose)`,
    messages: [
      {
        role: 'user',
        content: `Translate this indie hacker article into natural Spanish for Latin American readers.

[ENGLISH TITLE]
${en.en_title}

[ENGLISH SUMMARY]
${en.en_summary}

[ENGLISH INSIGHT]
${en.en_insight}

Return ONLY this JSON (no extra text, no markdown wrapper):
{
  "es_title": "Spanish title — catchy, natural, not a literal translation",
  "es_summary": "Full Spanish summary preserving ## section headings",
  "es_insight": "Spanish insight (under 150 characters)"
}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const text = textBlock ? textBlock.text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse Spanish translation response as JSON');
  return JSON.parse(match[0]);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase not configured: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }

  // Fetch articles missing es_title but having en_title (most recently created first)
  const { data: articles, error: fetchError } = await supabase
    .from('articles')
    .select('id, en_title, en_summary, en_insight')
    .is('es_title', null)
    .not('en_title', 'is', null)
    .order('created_at', { ascending: false })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ success: true, message: 'All articles already have Spanish translations!' });
  }

  const results: string[] = [];
  let updated = 0;

  for (const article of articles) {
    try {
      const translated = await translateToSpanish({
        en_title: article.en_title || '',
        en_summary: article.en_summary || '',
        en_insight: article.en_insight || '',
      });

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          es_title: translated.es_title || article.en_title,
          es_summary: translated.es_summary || article.en_summary,
          es_insight: translated.es_insight || article.en_insight,
        })
        .eq('id', article.id);

      if (updateError) {
        results.push(`[UPDATE ERROR] ${article.id}: ${updateError.message}`);
      } else {
        updated++;
        results.push(`[OK] ${article.en_title?.slice(0, 50)}`);
      }
    } catch (e) {
      results.push(`[TRANSLATE ERROR] ${article.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  const { count } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .is('es_title', null);

  results.push(`--- Done: ${updated}/${articles.length} updated. Remaining: ${count ?? '?'} ---`);

  return NextResponse.json({ success: true, results });
}
