import Anthropic from '@anthropic-ai/sdk';
import { INDUSTRY_VERTICALS, COUNTRY_PROFILES } from './market-intelligence';

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

/**
 * Build a market intelligence context that covers major global markets.
 * Used in translation to enrich "応用可能性" analysis without knowing user's country.
 */
function buildGlobalMarketContext(): string {
  const majorMarkets = ['JP', 'US', 'KR', 'DE', 'IN', 'SG'];
  const summaries = majorMarkets.map(code => {
    const p = COUNTRY_PROFILES[code];
    return `- ${p.name}（${p.nameLocal}）: EC市場${p.ecommerceMarketSize}、決済=${p.paymentPlatforms.slice(0, 2).join('/')}, ${p.culturalNotes.slice(0, 60)}...`;
  });
  return summaries.join('\n');
}

/**
 * Build industry cross-application hints for enrichment.
 */
function buildIndustryHints(): string {
  const top6 = INDUSTRY_VERTICALS.slice(0, 6);
  return top6.map(v => `- ${v.name}: ${v.examples.join('、')}`).join('\n');
}

export async function translateAndEnrich(article: {
  original_title: string;
  original_content: string;
  source: string;
}): Promise<TranslationResult> {
  const globalContext = buildGlobalMarketContext();
  const industryHints = buildIndustryHints();

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 6000,
    system: `あなたはPerplexity AIレベルの市場分析能力を持つビジネスアナリストです。
海外のインディーハッカー事例を分析し、グローバル市場での応用可能性を深く掘り下げてください。
データに基づいた具体的な数字、市場規模、成功確率を含めてください。
初心者にも分かりやすく、しかし深い洞察を提供してください。`,
    messages: [
      {
        role: 'user',
        content: `以下の海外インディーハッカーの投稿を分析し、JSON形式で返してください。
プログラミングやビジネスの初心者にもわかりやすく、具体的に書いてください。

【グローバル市場データ（参考）】
${globalContext}

【応用可能な業界】
${industryHints}

【分析ルール】
ja_summary は合計2500〜3500文字で、以下の7セクションを「## セクション名」形式で構造化してください：

## この事例のポイント（200文字）
- 一言で何がすごいのかを初心者にもわかるように説明
- 具体的な数字（MRR、ユーザー数、成長率）を含める

## 何を作ったのか（400文字）
- どんなサービス/プロダクトなのか
- 誰が使うのか（ターゲットユーザーのペルソナ）
- 何を解決しているのか（Before/Afterで説明）
- TAM（潜在市場規模）の推定を含める
- 初心者でもイメージできるよう具体例を交えて説明

## どうやって稼いでいるのか（400文字）
- 収益モデル（サブスク/買い切り/広告/アフィリエイト等）を詳しく
- 価格設定の具体的な数字とその根拠（なぜその価格か）
- 顧客獲得チャネル（どこから集客しているか）とCAC
- ユニットエコノミクス（LTV/CACの推定）
- 初心者向けに「つまりこういうこと」という解説を入れる

## 成功までのストーリー（500文字）
- 時系列で何があったか
- どんな失敗をしたか、なぜ失敗したか
- 何がターニングポイントだったか（再現可能な要因を分析）
- 「ここが学びポイント」を明示する
- 類似事例との比較で成功要因を浮き彫りにする

## 技術スタック・使用ツール（300文字）
- 推察含めて記載
- 各ツールが何をするものか初心者向けに1行説明をつける
  例：「Stripe（オンライン決済サービス。月額課金の仕組みを簡単に作れる）」
- 代替ツールも1〜2個併記（選択肢を示す）
- 初期費用/月額目安を含める

## あなたの地域での応用可能性（500文字）
このセクションはPerplexity級の市場分析を行ってください：
- この事業モデルのグローバル適用性スコア（★1〜5）
- 主要市場（日本/米国/欧州/東南アジア/インド）それぞれでの実現可能性を1行で
- 最も有望な市場とその理由
- 各市場固有の障壁（法規制、文化、決済）
- ローカライズのポイント（言語、決済手段、マーケティングチャネル）
- 「あなたの国で始めるなら」の具体的な第一歩

## この事例から得られるアイデアのヒント（400文字）
- この事例の核心的仕組み（抽象化）を1行で定義
- その仕組みを別業界に応用するアイデアを4つ提案
  各アイデアは：ターゲット＋課題＋ソリューション＋想定MRRの形式
- 例：「○○の仕組みを△△業界に応用→□□が困っている◇◇を解決→月$X想定」
- 最もローリスクで始められるアイデアを★マークで示す

【ja_insightについて】
- 「グローバルで応用するための示唆」として150文字以内で記述
- 具体的な市場データ（市場規模、成長率）を含める
- 特定の国に限定せず、世界中の読者が参考にできる内容にする

【元記事】
タイトル: ${article.original_title}
ソース: ${article.source}
内容: ${article.original_content.slice(0, 6000)}

【返答形式】必ずこのJSONのみを返してください:
{
  "ja_title": "日本語タイトル（50字以内、数字を含めてキャッチーに）",
  "ja_summary": "## この事例のポイント\\n...\\n\\n## 何を作ったのか\\n...\\n\\n## どうやって稼いでいるのか\\n...\\n\\n## 成功までのストーリー\\n...\\n\\n## 技術スタック・使用ツール\\n...\\n\\n## あなたの地域での応用可能性\\n...\\n\\n## この事例から得られるアイデアのヒント\\n...",
  "ja_insight": "グローバルで応用可能な示唆（150字以内・市場データ含む）",
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
