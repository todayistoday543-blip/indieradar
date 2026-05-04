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
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `以下の海外インディーハッカーの投稿を分析し、JSON形式で返してください。

【分析ルール】
1. ja_summary は 1500〜2000文字で、以下の4セクションを「## セクション名」形式で構造化してください：
   - ## 概要：冒頭100〜150字で結論と数字を提示し、読者を惹きつける
   - ## 事業モデル詳細：SaaS / マーケットプレイス / コンテンツ / ツール / API / コミュニティ等を特定し、収益構造・価格設定・顧客獲得方法を詳しく解説（400〜500字）
   - ## 成功経緯：時系列でどのようにプロダクトを立ち上げ、ユーザーを獲得し、収益化に至ったかをストーリーとして記述（400〜500字）
   - ## 技術スタック：使用している技術・ツール・サービスを具体的に列挙し、なぜその選択をしたかの背景も含める（200〜300字）

2. ja_insight は「グローバルで応用するための示唆」として150文字以内で記述。特定の国に限定せず、世界中の読者が参考にできる内容にする

3. 事業モデルの分類: SaaS / マーケットプレイス / コンテンツ / ツール / API / Chrome拡張 / モバイルアプリ / コミュニティ 等

4. 収益額の抽出: MRR / 月収 / ARR / 年収の数値を探してUSD整数に変換（なければnull）

5. 実行難易度: Easy（個人で1週間以内）/ Medium（1-3ヶ月）/ Hard（チーム必要 or 高資本）

【元記事】
タイトル: ${article.original_title}
ソース: ${article.source}
内容: ${article.original_content.slice(0, 6000)}

【返答形式】必ずこのJSONのみを返してください:
{
  "ja_title": "日本語タイトル（50字以内、数字を含めてキャッチーに）",
  "ja_summary": "## 概要\\n...\\n\\n## 事業モデル詳細\\n...\\n\\n## 成功経緯\\n...\\n\\n## 技術スタック\\n...",
  "ja_insight": "グローバルで応用可能な示唆（150字以内）。特定の国に限定しない具体的アクション",
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
