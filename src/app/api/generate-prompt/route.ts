import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase';
import {
  buildCountryContext,
  buildIndustryApplicationPrompt,
  COUNTRY_PROFILES,
} from '@/lib/market-intelligence';

export const dynamic = 'force-dynamic';

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

  // Verify Pro plan — this endpoint calls the Anthropic API and must be gated
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', user_id)
    .single();

  if (userProfile?.subscription_plan !== 'pro') {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
  }

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
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
  const costSection = profile
    ? `【${profile.name}での起業コスト目安】\n${profile.startupCost}\n\n【推奨決済プラットフォーム】\n${profile.paymentPlatforms.join(', ')}\n\n【税制情報】\n${profile.taxInfo}`
    : '';

  const targetLang = LOCALE_LANGUAGE[locale || 'ja'] || '日本語';
  const isJa = !locale || locale === 'ja';

  const systemPromptJa = `あなたはPerplexity AIレベルの精度を持つ、AIビジネス構築の専門家です。
プログラミング経験ゼロの超初心者でも理解できるよう、丁寧にステップバイステップで解説してください。
専門用語を使う場合は必ず（）内に初心者向けの説明を入れてください。
具体的な金額、URL、サービス名を積極的に含めてください。

【あなたの分析品質基準】
- 市場規模は具体的な数字で示す（例：「$10B市場で年率15%成長」）
- 競合分析は実名を挙げる（例：「Notion（$10B評価額）と同じ領域」）
- 法規制の注意点は国ごとに具体的に記載
- 成功確率の実データを引用（例：「SaaSの平均解約率は月5-7%」）
- コストは月単位で具体的に試算（例：「初月$0→3ヶ月目$50/月→6ヶ月目$200/月」）`;

  const systemPromptIntl = `You are an AI business-building expert with Perplexity AI-level precision.
Respond ENTIRELY in ${targetLang}.
Explain step-by-step so a complete beginner with zero programming experience can follow.
When using technical terms, always include a beginner-friendly explanation in parentheses.
Include specific dollar amounts, URLs, and service names wherever possible.

【Quality Standards】
- Market size with specific numbers (e.g., "$10B market growing at 15% YoY")
- Competitor analysis with real names (e.g., "Same space as Notion ($10B valuation)")
- Regulatory notes specific to the user's country
- Real success rate data (e.g., "Average SaaS churn is 5-7% monthly")
- Monthly cost projections (e.g., "Month 1: $0 → Month 3: $50/mo → Month 6: $200/mo")`;

  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 6000,
    system: isJa ? systemPromptJa : systemPromptIntl,
    messages: [
      {
        role: 'user',
        content: `${isJa
          ? '以下の海外マネタイズ事例を再現するための「AI実現ガイド」を生成してください。\n合計3500〜5000文字で、超初心者にも丁寧に、かつPerplexity AIレベルの深い市場分析を含めて書いてください。'
          : `Generate an "AI Realization Guide" to reproduce the following overseas monetization case.\nWrite 3500-5000 characters total in ${targetLang}, beginner-friendly with Perplexity AI-level market analysis.\nIMPORTANT: Your ENTIRE response must be in ${targetLang}.`
        }

${marketContext}

${costSection}

${industryContext}

【事例タイトル】${article.ja_title}
【概要】${(article.ja_summary as string)?.slice(0, 2000)}
【事業モデル】${article.business_model || '不明'}
【MRR】${article.mrr_mentioned ? `$${article.mrr_mentioned}/月` : '不明'}

以下の形式で出力してください：

## はじめに
「この事例を再現するために何が必要か、ゼロからステップバイステップで解説します。
プログラミング経験がなくても、AIを活用すれば始められます。」
（2〜3文で、この事例の核心とゴールを説明）
（市場機会のサマリー：この領域のTAM、成長率、なぜ今なのか）

## 市場分析：この事業は${profile ? profile.name : 'あなたの国'}で成功するか？
- この事業モデルのグローバル市場規模と成長トレンド
${profile ? `- ${profile.name}固有の市場環境分析\n- ${profile.name}での競合状況（実名を挙げる）\n- ${profile.name}特有の規制・法的要件\n- ${profile.name}での成功確率の推定（根拠付き）` : '- グローバル市場での機会分析\n- 主要5市場（米国/日本/EU/東南アジア/インド）での実現可能性比較'}

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
（この事例をベースにした、カスタマイズ可能な詳細実装プロンプト。
技術スタック指定、機能要件、DB設計、API設計を含む。
[あなたのアイデア]、[ターゲットユーザー]、[価格帯] などの置換箇所を明示。
${profile ? `${profile.name}市場向けの最適化ポイントも含める。` : ''})
\`\`\`

## 必要なツール・サービスと月額コスト
（テーブル形式で: サービス名 | 用途 | 無料/有料 | 月額目安 | ${profile ? profile.name + 'での代替' : '備考'}）
${profile ? `\n## ${profile.name}市場チェックリスト\n（${profile.name}でこの事業を始める際に確認すべき項目10個をチェックリスト形式で）` : ''}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const promptText = textBlock ? textBlock.text : '';

  return NextResponse.json({
    prompt: promptText,
    model_used: 'claude-sonnet-4-5-20250929',
  });
}
