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
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `以下の海外インディーハッカーの投稿を分析し、JSON形式で返してください。

【分析ルール】
1. 日本語要約（300文字）: 冒頭で数字・結論を出し、読者を惹きつける構成にする
2. 事業モデルの説明: SaaS / マーケットプレイス / コンテンツ / ツール / コミュニティ等を特定
3. 収益額の抽出: MRR / 月収 / ARR / 年収の数値を探してUSD整数に変換（なければnull）
4. 実行難易度: Easy（個人で1週間以内）/ Medium（1-3ヶ月）/ Hard（チーム必要 or 高資本）

【元記事】
タイトル: ${article.original_title}
ソース: ${article.source}
内容: ${article.original_content.slice(0, 4000)}

【返答形式】必ずこのJSONのみを返してください:
{
  "ja_title": "日本語タイトル（50字以内、数字を含めてキャッチーに）",
  "ja_summary": "日本語要約（300文字以内）。冒頭で数字・結論→具体的手法→実践ポイント",
  "ja_insight": "日本での活用ポイント（100字以内）。具体的なアクションを1つ提示",
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
