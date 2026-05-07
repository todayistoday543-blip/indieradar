import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

const LOCALE_LANGUAGE: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  zh: '中文',
  ko: '한국어',
  hi: 'हिन्दी',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

/** Simple per-user daily rate limit: max 5 plans per day */
const dailyCounts = new Map<string, { count: number; date: string }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const entry = dailyCounts.get(userId);

  if (!entry || entry.date !== today) {
    dailyCounts.set(userId, { count: 1, date: today });
    return { allowed: true, remaining: 4 };
  }

  if (entry.count >= 5) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: 5 - entry.count };
}

interface PlanSection {
  id: string;
  title: string;
  content: string;
}

export async function POST(req: NextRequest) {
  const { article_id, user_id, locale, country_name } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // TEMPORARY: Pro plan check disabled (trial period)
  // To restore, uncomment:
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('subscription_plan')
  //   .eq('id', user_id)
  //   .single();
  // if (!profile || profile.subscription_plan !== 'pro') {
  //   return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
  // }

  // Rate limit check
  const rateCheck = checkRateLimit(user_id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Daily limit reached (5/day)', remaining: 0 },
      { status: 429 }
    );
  }

  // Fetch article
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const isJa = locale === 'ja';
  const targetLang = LOCALE_LANGUAGE[locale || 'ja'] || 'English';

  const countryContext = country_name
    ? isJa
      ? `ユーザーの居住国は「${country_name}」です。この市場に特化した分析を含めてください。`
      : `The user is based in "${country_name}". Tailor the analysis to this market.`
    : '';

  const systemPrompt = isJa
    ? `あなたはインディーハッカー向けのビジネスプランナーAIです。
具体的で実行可能なビジネスプランを構造化されたJSON形式で生成してください。
各セクションは詳細かつ実践的な内容にしてください。
数字、金額、具体的なサービス名を積極的に含めてください。`
    : `You are a business planner AI for indie hackers.
Generate a concrete, actionable business plan in structured JSON format.
Respond ENTIRELY in ${targetLang}.
Each section should be detailed and practical.
Include specific numbers, dollar amounts, and service names wherever possible.`;

  const userPrompt = isJa
    ? `以下の事例に基づいて、ビジネスプランを生成してください。

【事例タイトル】${article.ja_title || article.en_title || article.original_title}
【概要】${((article.ja_summary || article.en_summary) as string)?.slice(0, 2000) || '情報なし'}
【事業モデル】${article.business_model || '不明'}
【MRR】${article.mrr_mentioned ? `$${article.mrr_mentioned}/月` : '不明'}
${countryContext}

以下の5セクションを含むJSONを返してください。各セクションの"content"は詳細なMarkdown文字列で、800〜1500文字程度にしてください。

{
  "sections": [
    {
      "id": "market_research",
      "title": "市場調査",
      "content": "（ターゲット市場規模、主要競合の実名と特徴、機会ギャップの分析。具体的な数字を含む。）"
    },
    {
      "id": "mvp_spec",
      "title": "MVP仕様",
      "content": "（コア機能リスト5〜8個、推奨技術スタック、推定構築期間、各機能の優先度。）"
    },
    {
      "id": "monetization",
      "title": "収益化戦略",
      "content": "（価格モデル、3段階の料金プラン提案、6ヶ月間の月次収益予測、成長戦略3つ。）"
    },
    {
      "id": "launch_plan",
      "title": "ローンチプラン",
      "content": "（4週間の週単位計画。各週に3〜5個の具体的アクション。投稿先プラットフォーム、テンプレート。）"
    },
    {
      "id": "landing_copy",
      "title": "LP用コピー",
      "content": "（ヘッドライン、サブヘッドライン、3つのバリュープロポジション、CTAテキスト。すべてコピペ可能な形式で。）"
    }
  ]
}

必ず有効なJSONのみを出力してください。JSON以外の文字列を含めないでください。`
    : `Based on the following case study, generate a business plan.

【Title】${article.en_title || article.original_title}
【Summary】${((article.en_summary || article.ja_summary) as string)?.slice(0, 2000) || 'No info'}
【Business Model】${article.business_model || 'Unknown'}
【MRR】${article.mrr_mentioned ? `$${article.mrr_mentioned}/mo` : 'Unknown'}
${countryContext}

Return a JSON with 5 sections. Each section's "content" should be a detailed Markdown string of 800-1500 characters. Write ENTIRELY in ${targetLang}.

{
  "sections": [
    {
      "id": "market_research",
      "title": "Market Research",
      "content": "(Target market size, named competitors with characteristics, opportunity gap analysis. Include specific numbers.)"
    },
    {
      "id": "mvp_spec",
      "title": "MVP Specification",
      "content": "(Core features list of 5-8 items, recommended tech stack, estimated build time, priority for each feature.)"
    },
    {
      "id": "monetization",
      "title": "Monetization Strategy",
      "content": "(Pricing model, 3-tier pricing proposal, 6-month monthly revenue projections, 3 growth tactics.)"
    },
    {
      "id": "launch_plan",
      "title": "Launch Plan",
      "content": "(4-week plan with 3-5 specific actions per week. Target platforms, templates.)"
    },
    {
      "id": "landing_copy",
      "title": "Landing Page Copy",
      "content": "(Headline, subheadline, 3 value propositions, CTA text. All in copy-pasteable format.)"
    }
  ]
}

Output ONLY valid JSON. Do not include any text outside the JSON.`;

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const raw = textBlock ? textBlock.text : '';

    // Extract JSON from the response (handle possible markdown fencing)
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let sections: PlanSection[];
    try {
      const parsed = JSON.parse(jsonStr);
      sections = parsed.sections || [];
    } catch {
      // If JSON parsing fails, wrap raw text as a single section
      sections = [
        {
          id: 'full_plan',
          title: isJa ? 'ビジネスプラン' : 'Business Plan',
          content: raw,
        },
      ];
    }

    return NextResponse.json({
      sections,
      remaining: rateCheck.remaining,
      model_used: 'claude-sonnet-4-5-20250929',
    });
  } catch (err) {
    console.error('Generate plan error:', err);
    return NextResponse.json(
      { error: 'Failed to generate plan' },
      { status: 500 }
    );
  }
}
