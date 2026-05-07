import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase';
import {
  buildCountryContext,
  buildIndustryApplicationPrompt,
  COUNTRY_PROFILES,
} from '@/lib/market-intelligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { article_id, user_id, country_name, country_code, locale } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  if (!article_id) {
    return NextResponse.json({ error: 'article_id is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // TEMPORARY: Pro plan check disabled (trial period)
  // To restore, uncomment the block below:
  // const { data: userProfile } = await supabase
  //   .from('profiles')
  //   .select('subscription_plan')
  //   .eq('id', user_id)
  //   .single();
  // if (userProfile?.subscription_plan !== 'pro') {
  //   return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
  // }

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // ── Cache check: reuse guide if generated within 30 days ──
  const cacheLocale = locale || 'ja';
  const cacheCountry = country_code || null;
  let cacheQuery = supabase
    .from('guide_cache')
    .select('guide_text, model_used')
    .eq('article_id', article_id)
    .eq('locale', cacheLocale)
    .gt('expires_at', new Date().toISOString());
  cacheQuery = cacheCountry
    ? cacheQuery.eq('country_code', cacheCountry)
    : cacheQuery.is('country_code', null);
  const { data: cacheHit } = await cacheQuery.maybeSingle();

  if (cacheHit) {
    return NextResponse.json({
      prompt: cacheHit.guide_text,
      model_used: cacheHit.model_used || 'cached',
      cached: true,
    });
  }

  // Perplexity-grade country context from market intelligence engine
  const marketContext = buildCountryContext(country_code || null);

  // Industry cross-application analysis
  const industryContext = buildIndustryApplicationPrompt(
    article.business_model || 'SaaS'
  );

  // Extra country-specific detail for the guide
  const profile = country_code
    ? COUNTRY_PROFILES[country_code.toUpperCase()]
    : null;

  const targetLang = LOCALE_LANGUAGE[locale || 'ja'] || '日本語';
  const isJa = !locale || locale === 'ja';

  // Build country cost section in the appropriate language
  const costSection = profile
    ? isJa
      ? `【${profile.name}での起業コスト目安】\n${profile.startupCost}\n\n【推奨決済プラットフォーム】\n${profile.paymentPlatforms.join(', ')}\n\n【税制情報】\n${profile.taxInfo}`
      : `[Startup cost estimate for ${profile.name}]\n${profile.startupCost}\n\n[Recommended payment platforms]\n${profile.paymentPlatforms.join(', ')}\n\n[Tax information]\n${profile.taxInfo}`
    : '';

  const systemPromptJa = `あなたはPerplexity AIレベルの精度を持つ、AIビジネス構築の専門家です。
プログラミング経験ゼロの超初心者でも理解できるよう、丁寧にステップバイステップで解説してください。
専門用語を使う場合は必ず（）内に初心者向けの説明を入れてください。
具体的な金額、URL、サービス名を積極的に含めてください。

【思考プロセス】
まず事例のビジネスモデルを分解し、収益構造・顧客セグメント・競合優位性を特定してから回答を組み立てること。
表面的な模倣ではなく、なぜこのモデルが機能するのかの構造的理解に基づいて解説すること。

【あなたの分析品質基準】
- 市場規模はTAM→SAM→SOMの3層で具体的数字を示す
- 競合分析は実名+資金調達額+ユーザー数を含める（例：「Notion（$10B評価額、3000万ユーザー）」）
- 法規制の注意点は国ごとに具体的に記載（該当法律名を含む）
- 成功確率の実データを引用（例：「SaaSの平均解約率は月5-7%、B2Bは2-3%」）
- コストは月単位で具体的に試算、API従量課金も含める（例：「Claude API: $3/1M input tokens」）
- 価格設定は競合の価格帯を3社以上比較した上で根拠を示す
- 実装プロンプトは実際にClaudeやCursorにそのまま貼って動く完成度にする`;

  const systemPromptIntl = `You are an AI business-building expert with Perplexity AI-level precision.
Respond ENTIRELY in ${targetLang}. Do NOT use Japanese or any other language.
Explain step-by-step so a complete beginner with zero programming experience can follow.
When using technical terms, include a beginner-friendly explanation in parentheses.
Include specific dollar amounts, URLs, and service names wherever possible.

Thinking Process:
First decompose the business model — identify the revenue structure, customer segments, and competitive advantage. Then build your answer on structural understanding of WHY this model works, not surface-level imitation.

Quality Standards:
- Market size in TAM → SAM → SOM layers with specific numbers
- Competitor analysis with real names + funding + user counts (e.g., "Notion ($10B valuation, 30M users)")
- Regulatory notes specific to the user's country (include law names where applicable)
- Real success rate data (e.g., "Average SaaS churn is 5-7% monthly, B2B is 2-3%")
- Monthly cost projections including API usage-based pricing (e.g., "Claude API: $3/1M input tokens")
- Pricing strategy backed by comparison of 3+ competitor price points
- Implementation prompts must be paste-ready — complete enough to use directly in Claude or Cursor`;

  // Build the user-facing prompt in the correct language
  const userPromptJa = `以下の海外マネタイズ事例を再現するための「AI実現ガイド」を生成してください。
合計2500〜3500文字で、超初心者にも丁寧に、かつ深い市場分析を含めて書いてください。簡潔さを重視し、冗長な説明は省いてください。

${marketContext}

${costSection}

${industryContext}

【事例タイトル】${article.ja_title || article.en_title}
【概要】${((article.ja_summary || article.en_summary) as string)?.slice(0, 2000)}
【事業モデル】${article.business_model || '不明'}
【MRR】${article.mrr_mentioned ? `$${article.mrr_mentioned}/月` : '不明'}

以下の形式で出力してください：

## はじめに
「この事例を再現するために何が必要か、ゼロからステップバイステップで解説します。
プログラミング経験がなくても、AIを活用すれば始められます。」
（2〜3文で、この事例の核心とゴールを説明）
（市場機会のサマリー：この領域のTAM、成長率、なぜ今なのか）

## 市場分析：この事業は${profile ? profile.name : 'あなたの国'}で成功するか？
- TAM（総市場規模）→ SAM（到達可能市場）→ SOM（獲得可能市場）を具体的数字で
- この事業モデルのグローバル市場規模と成長トレンド（CAGR含む）
- 主要競合3社以上の比較（名前、資金調達額、ユーザー数、価格帯）
${profile ? `- ${profile.name}固有の市場環境分析（市場成熟度、インターネット普及率、決済インフラ）\n- ${profile.name}での競合状況（ローカル競合も含めて実名で）\n- ${profile.name}特有の規制・法的要件（法律名を含む）\n- ${profile.name}での成功確率の推定（根拠付き）\n- ${profile.name}のユーザー獲得コスト（CAC）の目安` : '- グローバル市場での機会分析\n- 主要5市場（米国/日本/EU/東南アジア/インド）での実現可能性比較'}

## ステップ1：まず理解する（1〜2日目）
- この事業の本質は何か（1行で定義）
- なぜお金が発生するのか（価値の流れを図解的に説明）
- 競合との差別化ポイントは何か
- 自分に置き換えるとどの領域でやれるか（3つの具体例）
- 参考になるリソース（YouTube、ブログ、Podcast — 具体的なチャンネル名/記事名）

## ステップ2：環境を整える（3〜5日目）
- 契約すべきサービス一覧（それぞれ何のために使うか説明付き）
  テーブル形式で：
  | カテゴリ | サービス名 | 用途 | 月額コスト |
  |---|---|---|---|
  - ドメイン取得：Cloudflare Registrar（年間約$10）
  - ホスティング：Vercel（無料枠で十分）
  - 決済：${profile ? profile.paymentPlatforms[0] : 'Stripe'}
  - 認証：Supabase Auth（無料）
  - メール配信：Resend（無料枠月3,000通）
  - 分析：PostHog（無料枠月100万イベント）
${profile ? `- ${profile.name}固有の登録手順と注意点（法人登記、開業届など）` : '- グローバルに共通する登録手順'}
- 月別コストシミュレーション（1ヶ月目〜6ヶ月目）

## ステップ3：MVP（最小限の製品）を作る（1〜2週間）
- 最初に作るべき機能リスト（3〜5個に絞る。なぜその5個なのか、何を削るべきか説明）
- 使うべき技術スタック（初心者向けの選定理由付き）
- AIで構築するための具体的なプロンプト（コピペ可能なコードブロックで）
- 最低限のDB設計とAPI設計の概要

## ステップ4：世に出す（2〜3週間目）
- どこに投稿すべきか具体的に
${profile ? `  - ${profile.topPlatforms.join('、')}での投稿戦略` : `  - Product Hunt（ローンチの準備方法を3行で）
  - Reddit（どのサブレディットに、どんな文体で投稿するか）
  - Hacker News（Show HNの書き方テンプレート）`}
- 無料で最初の10ユーザーを獲得する方法（具体的に5つ）
- 価格設定のフレームワーク（無料→$X/月→$XX/月の段階設定 + 根拠）
- 最初の30日間のマーケティングカレンダー

## ステップ5：改善して成長させる（1ヶ月目〜）
- MRR $100 → $1,000 → $10,000 の各段階でやるべきこと（具体的なアクション）
- ユーザーフィードバックの集め方（具体的なツール名とテンプレート）
- 改善のサイクルの回し方
- チャーン率を下げる施策（3つ）
- 成長のためのレバレッジポイント

## 多業界応用アイデア
- このビジネスモデルの核心的仕組みを抽象化して定義
- 4つの業界への具体的な応用アイデア：
  各アイデアは「ターゲット→課題→ソリューション→想定MRR→必要期間」の形式で
- 最もローリスクなアイデアに★マーク

---

## Claudeで今すぐ始めるためのプロンプト

以下のプロンプトをコピーして、Claude（claude.ai）やCursor等のAIツールに貼り付けてください。
[あなたのアイデア] の部分を自分のやりたいことに書き換えるだけで使えます。

\`\`\`
以下の仕様でWebアプリケーションを構築してください。

【プロジェクト概要】
- アイデア: [あなたのアイデアをここに記入]
- ターゲットユーザー: [ターゲットユーザーをここに記入]
- 解決する課題: [解決したい具体的な課題]
- 収益モデル: ${article.business_model || 'SaaS'}型
- 目標価格帯: [無料プラン / $X/月 / $XX/月]

【技術スタック】
- フロントエンド: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- バックエンド: Next.js API Routes (Route Handlers)
- データベース: Supabase (PostgreSQL + Auth + Storage)
- 決済: ${profile ? profile.paymentPlatforms[0] : 'Stripe'} (サブスクリプション)
- デプロイ: Vercel
- メール: Resend
- 分析: PostHog

【必須機能（MVP）】
この事例「${article.ja_title || article.en_title}」を参考に、以下を実装：
1. ユーザー認証（Google OAuth + メール/パスワード）
2. [コア機能1: この事例の主要価値提供機能]
3. [コア機能2: ユーザーが繰り返し使う機能]
4. [コア機能3: 差別化要素となる機能]
5. 決済・サブスクリプション管理
6. ランディングページ（コンバージョン最適化済み）

【DB設計】
以下のテーブルを設計してください：
- users (Supabase Auth連携)
- [メインデータテーブル]
- subscriptions (プラン管理)
- 必要に応じて追加テーブル

【API設計】
- POST /api/[メイン機能] — コア機能のCRUD
- POST /api/webhooks/${profile ? profile.paymentPlatforms[0].toLowerCase() : 'stripe'} — 決済Webhook
- GET /api/[データ取得] — ダッシュボード用

【ページ構成】
/ — ランディングページ
/app — メインダッシュボード
/pricing — 料金ページ
/auth/login — ログイン
/settings — アカウント設定

${profile ? `【${profile.name}市場向け最適化】\n- 言語: ${profile.name}のデフォルト言語対応\n- 決済: ${profile.paymentPlatforms.join(', ')}\n- 法的要件: ${profile.taxInfo}\n` : ''}
まずプロジェクトのセットアップから始めて、各機能を順番に実装してください。
各ステップでファイル名とコード全文を出力してください。
\`\`\`

## 必要なツール・サービスと月額コスト
（テーブル形式で: サービス名 | 用途 | 無料/有料 | 月額目安 | ${profile ? profile.name + 'での代替' : '備考'}）
${profile ? `\n## ${profile.name}市場チェックリスト\n（${profile.name}でこの事業を始める際に確認すべき項目10個をチェックリスト形式で）` : ''}`;

  const userPromptIntl = `Generate an "AI Realization Guide" to reproduce the following monetization case.
Write 2500-3500 words in ${targetLang}, step-by-step for beginners, with deep market analysis. Prioritize conciseness — cut verbose explanations.
IMPORTANT: Your ENTIRE response must be in ${targetLang}. Do not include Japanese text.

${marketContext}

${costSection}

${industryContext}

Case Title: ${article.en_title || article.ja_title}
Summary: ${((article.en_summary || article.ja_summary) as string)?.slice(0, 2000)}
Business Model: ${article.business_model || 'Unknown'}
MRR: ${article.mrr_mentioned ? `$${article.mrr_mentioned}/mo` : 'Not mentioned'}

Output in this structure:

## Introduction
(2-3 sentences explaining what this case is about and what the reader will learn.
Include a market opportunity summary: TAM, growth rate, why now.)

## Market Analysis: Will this work in ${profile ? profile.name : 'your country'}?
- TAM (Total Addressable Market) → SAM (Serviceable) → SOM (Obtainable) with specific numbers
- Global market size and growth trend (include CAGR)
- Compare 3+ key competitors (name, funding, user count, pricing)
${profile
  ? `- ${profile.name}-specific market environment (maturity, internet penetration, payment infrastructure)\n- Competitive landscape in ${profile.name} (include local competitors by name)\n- Regulations and legal requirements in ${profile.name} (include law names)\n- Estimated success probability with justification\n- Estimated customer acquisition cost (CAC) in ${profile.name}`
  : '- Global market opportunity\n- Feasibility comparison across 5 major markets (US/Japan/EU/SE Asia/India)'}

## Step 1: Understand the Model (Days 1-2)
- Core essence of this business in one sentence
- Why money flows (explain value exchange clearly for beginners)
- Key differentiation from competitors
- 3 concrete examples of how YOU could apply this
- Recommended learning resources (YouTube channels, blogs, podcasts — specific names)

## Step 2: Set Up Your Stack (Days 3-5)
- List of services to sign up for (with purpose explained for each)
  Table format:
  | Category | Service | Purpose | Monthly Cost |
  |---|---|---|---|
  - Domain: Cloudflare Registrar (~$10/yr)
  - Hosting: Vercel (free tier sufficient)
  - Payments: ${profile ? profile.paymentPlatforms[0] : 'Stripe'}
  - Auth: Supabase Auth (free)
  - Email: Resend (3,000/mo free)
  - Analytics: PostHog (1M events/mo free)
${profile ? `- Registration steps and gotchas specific to ${profile.name}` : '- Universal registration steps'}
- Monthly cost simulation (Month 1 through Month 6)

## Step 3: Build the MVP (Weeks 1-2)
- Feature list (limit to 3-5; explain why these and what to cut)
- Recommended tech stack with beginner-friendly rationale
- Concrete AI prompt to build this (paste-ready code block)
- Minimal DB and API design overview

## Step 4: Launch (Weeks 2-3)
- Where to post, specifically:
${profile ? `  - Strategy for ${profile.topPlatforms.join(', ')}` : `  - Product Hunt (3-line prep guide)
  - Reddit (which subreddits, what tone)
  - Hacker News (Show HN template)`}
- 5 concrete ways to get your first 10 users for free
- Pricing framework (Free → $X/mo → $XX/mo with rationale)
- 30-day marketing calendar

## Step 5: Grow (Month 1+)
- Actions at MRR $100 → $1,000 → $10,000 (specific steps per stage)
- How to collect user feedback (tools and templates)
- Iteration cadence
- 3 tactics to reduce churn
- Key growth levers

## Cross-Industry Application Ideas
- Distill the core mechanism of this case into one sentence
- 4 application ideas in other industries:
  Each in format: Target → Problem → Solution → Expected MRR → Time needed
- Mark the lowest-risk idea with ★

---

## Ready-to-use AI Prompt

Copy this into Claude (claude.ai) or Cursor. Replace [YOUR IDEA] with your own concept.

\`\`\`
Build a web application with the following specification.

[PROJECT OVERVIEW]
- Idea: [YOUR IDEA HERE]
- Target User: [TARGET USER HERE]
- Problem to Solve: [SPECIFIC PROBLEM]
- Revenue Model: ${article.business_model || 'SaaS'}
- Target Pricing: [Free tier / $X/mo / $XX/mo]

[TECH STACK]
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: Next.js API Routes (Route Handlers)
- Database: Supabase (PostgreSQL + Auth + Storage)
- Payments: ${profile ? profile.paymentPlatforms[0] : 'Stripe'} (subscriptions)
- Deploy: Vercel
- Email: Resend
- Analytics: PostHog

[MVP FEATURES]
Based on the case "${article.en_title || article.ja_title}", implement:
1. User authentication (Google OAuth + email/password)
2. [Core Feature 1: main value delivery]
3. [Core Feature 2: recurring engagement feature]
4. [Core Feature 3: differentiation feature]
5. Payment & subscription management
6. Landing page (conversion-optimized)

[DATABASE DESIGN]
Design these tables:
- users (linked to Supabase Auth)
- [main data table]
- subscriptions (plan management)
- Additional tables as needed

[API DESIGN]
- POST /api/[main-feature] — core CRUD
- POST /api/webhooks/${profile ? profile.paymentPlatforms[0].toLowerCase() : 'stripe'} — payment webhook
- GET /api/[data-fetch] — dashboard data

[PAGE STRUCTURE]
/ — Landing page
/app — Main dashboard
/pricing — Pricing page
/auth/login — Login
/settings — Account settings

${profile ? `[${profile.name.toUpperCase()} MARKET OPTIMIZATION]\n- Language: ${profile.name} default language support\n- Payments: ${profile.paymentPlatforms.join(', ')}\n- Legal: ${profile.taxInfo}\n` : ''}
Start with project setup, then implement each feature in order.
Output full file names and complete code for each step.
\`\`\`

## Required Tools & Monthly Costs
(Table: Service | Purpose | Free/Paid | Est. Monthly Cost | ${profile ? profile.name + ' alternative' : 'Notes'})
${profile ? `\n## ${profile.name} Market Checklist\n(10-item checklist for launching this business in ${profile.name})` : ''}`;

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 5000,
      temperature: 0.3,
      system: isJa ? systemPromptJa : systemPromptIntl,
      messages: [
        {
          role: 'user',
          content: isJa ? userPromptJa : userPromptIntl,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const promptText = textBlock ? textBlock.text : '';

    // ── Save to cache (30-day TTL) ──
    if (promptText.length > 100) {
      await supabase.from('guide_cache').upsert({
        article_id,
        locale: cacheLocale,
        country_code: cacheCountry,
        guide_text: promptText,
        model_used: 'claude-sonnet-4-5-20250929',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'article_id,locale,country_code' });
    }

    return NextResponse.json({
      prompt: promptText,
      model_used: 'claude-sonnet-4-5-20250929',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('generate-prompt error:', msg);
    if (msg.includes('credit') || msg.includes('balance')) {
      return NextResponse.json({ error: 'AI service temporarily unavailable. Please try again later.' }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
