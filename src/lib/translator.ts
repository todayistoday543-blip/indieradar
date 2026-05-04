import Anthropic from '@anthropic-ai/sdk';

// Lazy-init: never throws at module evaluation time during build.
function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

interface TranslationResult {
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_difficulty: '初級' | '中級' | '上級';
  mrr_mentioned: number | null;
}

export async function translateAndEnrich(article: {
  original_title: string;
  original_content: string;
  source: string;
}): Promise<TranslationResult> {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `以下の海外インディーハッカーの投稿を日本語に翻訳・要約し、JSON形式で返してください。

【最重要ルール：冒頭10行で読者を惹きつける構成にすること】
ja_summaryは以下の「フック構成」で書いてください：

1行目: 衝撃的な結論・数字から始める（例：「月収300万円を個人開発で達成した」）
2-3行目: 読者が「自分にもできるかも」と思えるストーリーの入口
4-6行目: 具体的な手法・戦略の概要（数字を交えて）
7-10行目: さらに深い分析・ターニングポイント
11行目以降: 詳細な実践方法・具体的ステップ・技術的な解説

※最初の10行（約300文字）だけ読んでも価値がある記事にすること
※数字・金額・期間は具体的に含めること
※改行で段落を分け、読みやすくすること

【元記事】
タイトル: ${article.original_title}
ソース: ${article.source}
内容: ${article.original_content.slice(0, 3000)}

【返答形式】必ずこのJSONのみを返してください:
{
  "ja_title": "日本語タイトル（50字以内、数字や金額を含めてキャッチーに）",
  "ja_summary": "フック構成の日本語要約（500〜800字）。冒頭10行で惹きつけ、後半で詳細を展開。段落は改行で区切る",
  "ja_insight": "日本での活用ポイント（150字）。具体的なアクションを1つ提示。数字目標を含める",
  "ja_difficulty": "初級 or 中級 or 上級",
  "mrr_mentioned": MRR金額をドルの整数で（言及がなければnull）
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
