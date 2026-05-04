import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

export async function POST(req: NextRequest) {
  const { article_id, user_id, country_name, country_code } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Country-specific payment & service recommendations
  const countryContext = country_name
    ? `ユーザーの所在国: ${country_name}（${country_code || ''}）。
この国で使える決済サービス、法規制、市場特性を考慮してアドバイスしてください。
例えば:
- 決済: ${getPaymentRecommendation(country_code || '')}
- その国の市場規模や競合状況への言及`
    : `ユーザーの所在国は不明です。グローバルに適用可能なアドバイスを提供してください。
決済はStripe（グローバル対応）、LemonSqueezy（VAT自動処理）などを推奨。`;

  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 5000,
    system: `あなたはAIを活用したビジネス構築の専門家です。
プログラミング経験ゼロの超初心者でも理解できるよう、丁寧にステップバイステップで解説してください。
専門用語を使う場合は必ず（）内に初心者向けの説明を入れてください。
具体的な金額、URL、サービス名を積極的に含めてください。`,
    messages: [
      {
        role: 'user',
        content: `以下の海外マネタイズ事例を再現するための「AI実現ガイド」を生成してください。
合計3000〜4000文字で、超初心者にも丁寧に書いてください。

${countryContext}

【事例タイトル】${article.ja_title}
【概要】${article.ja_summary?.slice(0, 2000)}
【事業モデル】${article.business_model || '不明'}
【MRR】${article.mrr_mentioned ? `$${article.mrr_mentioned}/月` : '不明'}

以下の形式で出力してください：

## はじめに
「この事例を再現するために何が必要か、ゼロからステップバイステップで解説します。
プログラミング経験がなくても、AIを活用すれば始められます。」
（2〜3文で、この事例の核心とゴールを説明）

## ステップ1：まず理解する（1〜2日目）
- この事業の本質は何か（1行で）
- なぜお金が発生するのか（価値の流れを図解的に説明）
- 自分に置き換えるとどの領域でやれるか考える
- 参考になるYouTube動画やブログ記事のジャンル（具体的に）

## ステップ2：環境を整える（3〜5日目）
- 契約すべきサービス一覧（それぞれ何のために使うか説明付き）
  例の形式で：
  - ドメイン取得：Cloudflare Registrar（年間約$10）
  - ホスティング：Vercel（無料枠で十分）
  - 決済：Stripe（手数料2.9%+30¢）
  - 認証：Supabase Auth（無料）
  - メール配信：Resend（無料枠月3,000通）
- 各サービスの登録手順のポイント
- ユーザーの居住国に応じた注意点

## ステップ3：MVP（最小限の製品）を作る（1〜2週間）
- 最初に作るべき機能リスト（3〜5個に絞る。なぜその5個なのか説明）
- 使うべき技術スタック（初心者向けの選定理由付き）
- AIで構築するための具体的なプロンプト（コピペ可能なコードブロックで）

## ステップ4：世に出す（2〜3週間目）
- どこに投稿すべきか具体的に
  - Product Hunt（ローンチの準備方法を3行で）
  - Reddit（どのサブレディットに、どんな文体で投稿するか）
  - Hacker News（Show HNの書き方テンプレート）
- 無料で最初の10ユーザーを獲得する方法
- 価格設定のフレームワーク（無料→$X/月→$XX/月の段階設定）

## ステップ5：改善して成長させる（1ヶ月目〜）
- MRR $100 → $1,000 → $10,000 の各段階でやるべきこと
- ユーザーフィードバックの集め方（具体的なツール名）
- 改善のサイクルの回し方

---

## Claudeで今すぐ始めるためのプロンプト

以下のプロンプトをコピーして、Claude（claude.ai）やCursor等のAIツールに貼り付けてください。
[あなたのアイデア] の部分を自分のやりたいことに書き換えるだけで使えます。

\`\`\`
（この事例をベースにした、カスタマイズ可能な詳細実装プロンプト。
技術スタック指定、機能要件、DB設計、API設計を含む。
[あなたのアイデア]、[ターゲットユーザー]、[価格帯] などの置換箇所を明示）
\`\`\`

## 必要なツール・サービスと月額コスト
（テーブル形式で: サービス名 | 用途 | 無料/有料 | 月額目安）`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const promptText = textBlock ? textBlock.text : '';

  return NextResponse.json({
    prompt: promptText,
    model_used: 'claude-sonnet-4-5',
  });
}

/** Country-based payment recommendation helper */
function getPaymentRecommendation(code: string): string {
  const upper = code.toUpperCase();
  if (upper === 'JP') return 'Stripe JP（日本対応済み）、PAY.JP';
  if (['TH', 'VN', 'ID', 'PH', 'MY', 'SG'].includes(upper))
    return 'Paddle, LemonSqueezy（東南アジアVAT対応）';
  if (['DE', 'FR', 'GB', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'AT', 'CH', 'BE', 'IE', 'PT'].includes(upper))
    return 'Stripe EU + LemonSqueezy（EU VAT自動処理）';
  if (['US', 'CA'].includes(upper))
    return 'Stripe（北米スタンダード）';
  if (['KR'].includes(upper))
    return 'Stripe KR、Toss Payments';
  if (['IN'].includes(upper))
    return 'Razorpay, Stripe India';
  if (['BR'].includes(upper))
    return 'Stripe Brazil, PagSeguro';
  return 'Stripe（200カ国以上対応）、LemonSqueezy（VAT自動処理）';
}
