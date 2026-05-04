import Anthropic from '@anthropic-ai/sdk';

// Lazy-init: never throws at module evaluation time during build.
function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

export interface TranslationResult {
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_difficulty: 'Easy' | 'Medium' | 'Hard';
  business_model: string;
  mrr_mentioned: number | null;
}

export async function translateAndEnrich(article: {
  original_title: string;
  original_content: string;
  source: string;
}): Promise<TranslationResult> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 6000,
    messages: [
      {
        role: 'user',
        content: `以下の海外インディーハッカーの投稿を分析し、JSON形式で返してください。
プログラミングやビジネスの初心者にもわかりやすく、具体的に書いてください。

【分析ルール】
ja_summary は合計2500〜3500文字で、以下の7セクションを「## セクション名」形式で構造化してください：

## この事例のポイント（200文字）
- 一言で何がすごいのかを初心者にもわかるように説明

## 何を作ったのか（400文字）
- どんなサービス/プロダクトなのか
- 誰が使うのか
- 何を解決しているのか
- 初心者でもイメージできるよう具体例を交えて説明

## どうやって稼いでいるのか（400文字）
- 収益モデル（サブスク/買い切り/広告/アフィリエイト等）を詳しく
- 価格設定の具体的な数字
- 顧客獲得チャネル（どこから集客しているか）
- 初心者向けに「つまりこういうこと」という解説を入れる

## 成功までのストーリー（500文字）
- 時系列で何があったか
- どんな失敗をしたか
- 何がターニングポイントだったか
- 「ここが学びポイント」を明示する

## 技術スタック・使用ツール（300文字）
- 推察含めて記載
- 各ツールが何をするものか初心者向けに1行説明をつける
  例：「Stripe（オンライン決済サービス。月額課金の仕組みを簡単に作れる）」

## あなたの地域での応用可能性（400文字）
- グローバルに始められる事業の場合→「世界のどこからでも始められる理由」
- ローカル事業の場合→「あなたの地域で始めるなら」
- 具体的な応用のヒントを含める

## この事例から得られるアイデアのヒント（300文字）
- この事例をヒントに、別のニッチに応用するアイデアを3つ提案
- 例：「○○の仕組みを△△業界に応用すると…」

【ja_insightについて】
- 「グローバルで応用するための示唆」として150文字以内で記述
- 特定の国に限定せず、世界中の読者が参考にできる内容にする

【元記事】
タイトル: ${article.original_title}
ソース: ${article.source}
内容: ${article.original_content.slice(0, 6000)}

【返答形式】必ずこのJSONのみを返してください:
{
  "ja_title": "日本語タイトル（50字以内、数字を含めてキャッチーに）",
  "ja_summary": "## この事例のポイント\\n...\\n\\n## 何を作ったのか\\n...\\n\\n## どうやって稼いでいるのか\\n...\\n\\n## 成功までのストーリー\\n...\\n\\n## 技術スタック・使用ツール\\n...\\n\\n## あなたの地域での応用可能性\\n...\\n\\n## この事例から得られるアイデアのヒント\\n...",
  "ja_insight": "グローバルで応用可能な示唆（150字以内）",
  "ja_difficulty": "Easy or Medium or Hard",
  "business_model": "事業モデル名（例: SaaS, マーケットプレイス, Chrome拡張, API）",
  "mrr_mentioned": MRR金額をUSDの整数で（記事中に収益言及がなければnull）
}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const text = textBlock ? textBlock.text : '{}';

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Failed to parse Claude response as JSON');
  }

  return JSON.parse(match[0]) as TranslationResult;
}
