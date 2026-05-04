import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase';
import { PLANS } from '@/lib/plans';
import type { PlanKey } from '@/lib/plans';

export const dynamic = 'force-dynamic';

// Lazy-init so the module never throws during build-time evaluation.
function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

export async function POST(req: NextRequest) {
  const { article_id, user_id } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', user_id)
    .single();

  const planKey = (profile?.subscription_plan as PlanKey) || 'free';
  const plan = PLANS[planKey] || PLANS.free;

  if (!plan.features.prompt_generation) {
    return NextResponse.json(
      {
        error: 'Proプランでご利用いただけます',
        upgrade_url: '/pricing',
      },
      { status: 403 }
    );
  }

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json(
      { error: '記事が見つかりません' },
      { status: 404 }
    );
  }

  const model =
    plan.features.ai_prompt_model === 'sonnet'
      ? 'claude-sonnet-4-5'
      : 'claude-haiku-4-5';

  const systemPrompt =
    plan.features.ai_prompt_model === 'sonnet'
      ? 'あなたはAIを活用したビジネス構築の専門家です。海外の成功事例を日本の文脈で再現するための詳細な実装プロンプトと戦略を提供してください。'
      : 'あなたはAIビジネス構築のアシスタントです。実装プロンプトを提供してください。';

  const maxTokens = plan.features.ai_prompt_model === 'sonnet' ? 2048 : 1024;

  const message = await getAnthropic().messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `以下の海外マネタイズ事例を日本で再現するための実装プロンプトを生成してください。

【事例タイトル】${article.ja_title}
【概要】${article.ja_summary}
【元記事URL】${article.source_url || article.original_url}

以下の形式で出力してください：

## 1. Claude Code / Codexに投げるプロンプト
（コードブロックで、すぐにコピーして使えるプロンプト）

## 2. 必要なツール・サービス一覧
（無料/有料を明記）

## 3. 日本で展開する際の注意点
（法律・文化的な差異）

## 4. 最初の1週間でやること
（ステップバイステップ）`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const promptText = textBlock ? textBlock.text : '';

  return NextResponse.json({
    prompt: promptText,
    model_used: model,
    plan: planKey,
  });
}
