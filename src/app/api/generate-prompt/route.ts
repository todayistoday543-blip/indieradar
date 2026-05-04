import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Lazy-init so the module never throws during build-time evaluation.
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
    return NextResponse.json(
      { error: 'Article not found' },
      { status: 404 }
    );
  }

  // Country context for localized recommendations
  const countryContext = country_name
    ? `ユーザーの所在国: ${country_name}（${country_code || ''}）。この国の市場環境・規制・文化を考慮した具体的なアドバイスを含めてください。`
    : 'ユーザーの所在国は不明です。グローバルに適用可能なアドバイスを提供してください。';

  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    system: 'あなたはAIを活用したビジネス構築の専門家です。海外の成功事例をユーザーの国・地域の文脈で再現するための実践的なガイドを提供してください。具体的で、すぐに行動に移せる内容にしてください。',
    messages: [
      {
        role: 'user',
        content: `以下の海外マネタイズ事例を再現するための「AI実現ガイド」を生成してください。

${countryContext}

【事例タイトル】${article.ja_title}
【概要】${article.ja_summary}
【事業モデル】${article.business_model || '不明'}
【MRR】${article.mrr_mentioned ? `$${article.mrr_mentioned}/月` : '不明'}

以下の形式で出力してください：

## Phase 1: リサーチ & 検証（1〜3日）
- ターゲット市場の調査手順
- 競合分析の方法
- 需要検証の具体的ステップ

## Phase 2: MVP構築（1〜2週間）
- 最小構成のプロダクト定義
- 推奨技術スタック
- 開発の優先順位

## Phase 3: ローンチ & 初期ユーザー獲得（2〜4週間）
- ローンチ戦略
- 無料/有料の集客チャネル
- 初期フィードバックの収集方法

## Phase 4: 収益化 & グロース
- 価格設定戦略
- スケーリングのポイント
- KPIと目標設定

---

## Claude / AI に投げるプロンプト

\`\`\`
（このビジネスのMVPを構築するためにClaude CodeやCursorに投げられる、コピー可能な実装プロンプト。技術スタック指定、機能要件、DB設計などを含む詳細なプロンプト）
\`\`\`

## 必要なツール・サービス一覧
（無料/有料を明記、月額コストの目安も含む）`,
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
