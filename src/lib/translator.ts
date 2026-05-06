import Anthropic from '@anthropic-ai/sdk';
import { INDUSTRY_VERTICALS, COUNTRY_PROFILES } from './market-intelligence';

// Lazy-init: never throws at module evaluation time during build.
function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
}

export interface TranslationResult {
  // English (base language)
  en_title: string;
  en_summary: string;
  en_insight: string;
  // Japanese (意訳 — contextual translation)
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  // Spanish (意訳 — contextual translation)
  es_title: string;
  es_summary: string;
  es_insight: string;
  // Metadata
  ja_difficulty: 'Easy' | 'Medium' | 'Hard';
  business_model: string;
  mrr_mentioned: number | null;
  /** true = genuine indie-hacker business case; false = skip publishing */
  is_business_case: boolean;
}

/**
 * Build a market intelligence context that covers major global markets.
 * Used in analysis to enrich "Market Applicability" section without knowing user's country.
 */
function buildGlobalMarketContext(): string {
  const majorMarkets = ['JP', 'US', 'KR', 'DE', 'IN', 'SG'];
  const summaries = majorMarkets.map(code => {
    const p = COUNTRY_PROFILES[code];
    return `- ${p.name}: e-commerce market ${p.ecommerceMarketSize}, payments=${p.paymentPlatforms.slice(0, 2).join('/')}, ${p.culturalNotes.slice(0, 60)}...`;
  });
  return summaries.join('\n');
}

/**
 * Build industry cross-application hints for enrichment.
 */
function buildIndustryHints(): string {
  const top6 = INDUSTRY_VERTICALS.slice(0, 6);
  return top6.map(v => `- ${v.name}: ${v.examples.join(', ')}`).join('\n');
}

/**
 * CALL 1: Enrich article in English.
 * Returns all metadata + English content fields.
 */
async function enrichInEnglish(article: {
  original_title: string;
  original_content: string;
  source: string;
}): Promise<{
  is_business_case: boolean;
  en_title: string;
  en_summary: string;
  en_insight: string;
  ja_difficulty: 'Easy' | 'Medium' | 'Hard';
  business_model: string;
  mrr_mentioned: number | null;
}> {
  const globalContext = buildGlobalMarketContext();
  const industryHints = buildIndustryHints();

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 5000,
    system: `You are a business analyst with Perplexity AI-level market analysis capabilities.
Analyze indie hacker case studies and provide deep insights on global market applicability.
Include data-driven specific numbers, market sizes, and success probabilities.
Write in clear, accessible English that beginners can understand, while providing deep insights.`,
    messages: [
      {
        role: 'user',
        content: `Analyze the following indie hacker post and return JSON.
Write clearly and concretely so beginners in programming or business can understand.

[GLOBAL MARKET DATA (reference)]
${globalContext}

[APPLICABLE INDUSTRIES]
${industryHints}

[ANALYSIS RULES]
en_summary should total 2500-3500 characters, structured with 7 sections in "## Section Name" format:

## Key Takeaways (200 chars)
- Explain in one sentence what makes this case remarkable, accessible to beginners
- Include specific numbers (MRR, user count, growth rate)

## What Was Built (400 chars)
- What service/product was created
- Who uses it (target user persona)
- What problem it solves (Before/After explanation)
- Include TAM (total addressable market) estimate
- Use concrete examples so beginners can visualize it

## How They Make Money (400 chars)
- Revenue model (subscription/one-time/ads/affiliate etc.) in detail
- Specific pricing numbers and rationale (why that price)
- Customer acquisition channels (where traffic comes from) and CAC
- Unit economics (LTV/CAC estimates)
- Include a "in other words, here's what this means" explanation for beginners

## The Journey (500 chars)
- What happened chronologically
- What failures occurred and why
- What the turning point was (analyze reproducible factors)
- Explicitly highlight "key learning points"
- Surface success factors by comparing to similar cases

## Tech Stack & Tools (300 chars)
- List tools including inferred ones
- Add one-line beginner-friendly explanation per tool
  e.g., "Stripe (online payment service - easily add subscription billing)"
- Include 1-2 alternative tools (show options)
- Include estimated initial/monthly costs

## Market Applicability (500 chars)
Provide Perplexity-level market analysis:
- Global applicability score for this business model (★1-5)
- Feasibility in each major market (Japan/US/Europe/SE Asia/India) in one line each
- Most promising market and why
- Market-specific barriers (regulations, culture, payments)
- Localization points (language, payment methods, marketing channels)
- Concrete first step if starting in your country

## Idea Seeds (400 chars)
- Define the core mechanism of this case in one line (abstracted)
- Propose 4 ideas applying this mechanism to other industries
  Each idea in format: Target + Problem + Solution + Expected MRR
- e.g., "Apply X mechanism to Y industry → solve Z problem for W → $X/mo expected"
- Mark the lowest-risk idea to start with ★

[About en_insight]
- Write as "Global applicability insights" in 150 characters or less
- Include specific market data (market size, growth rate)
- Not limited to one country — write so readers worldwide can use it

[Original Article]
Title: ${article.original_title}
Source: ${article.source}
Content: ${article.original_content.slice(0, 6000)}

[is_business_case criteria]
true: monetization cases by indie hackers/solo devs/small teams, product/service launches, business model explanations
false: political news, celebrity topics, major game company updates, satire/parody articles, pure technical questions (no business angle), job search reports

[RESPONSE FORMAT] Return ONLY this JSON:
{
  "is_business_case": true or false,
  "en_title": "English title (under 80 chars, catchy with numbers if available)",
  "en_summary": "## Key Takeaways\\n...\\n\\n## What Was Built\\n...\\n\\n## How They Make Money\\n...\\n\\n## The Journey\\n...\\n\\n## Tech Stack & Tools\\n...\\n\\n## Market Applicability\\n...\\n\\n## Idea Seeds\\n...",
  "en_insight": "Global applicability insight (under 150 chars, include market data)",
  "ja_difficulty": "Easy or Medium or Hard",
  "business_model": "Business model name (e.g., SaaS, Marketplace, Chrome Extension, API)",
  "mrr_mentioned": MRR amount as integer in USD (null if no revenue mentioned in article)
}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const text = textBlock ? textBlock.text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse enrichment response as JSON');

  return JSON.parse(match[0]);
}

/**
 * CALL 2: Translate English content to both Japanese and Spanish simultaneously.
 * Uses 意訳 (contextual/adaptive translation) — not literal word-for-word.
 * Returns translated title, summary, and insight for both languages.
 */
async function translateToJaAndEs(english: {
  en_title: string;
  en_summary: string;
  en_insight: string;
}): Promise<{
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  es_title: string;
  es_summary: string;
  es_insight: string;
}> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    system: `You are a professional translator and content strategist specializing in Japanese and Spanish localization.
Your translations are 意訳 (contextual/adaptive) — you deeply understand the meaning and restructure
sentences to feel completely natural to native speakers, rather than translating word-for-word.

Translation principles:
- Preserve the exact section structure (## headings must remain)
- Adapt expressions, idioms, and metaphors to feel native in each target language
- For Japanese: use a mix of formal and accessible language; use katakana for tech terms; keep $ amounts in USD
- For Spanish: use Latin American Spanish conventions; keep tech terms natural; maintain an engaging tone
- Keep all: product names, URLs, dollar/yen amounts, technical tool names, "Easy/Medium/Hard" labels
- Section headings should be translated naturally (not literally)
- Numbers, statistics, and facts must never change`,
    messages: [
      {
        role: 'user',
        content: `Translate the following English indie hacker case study content into BOTH Japanese AND Spanish.
Both translations must be 意訳 — convey the exact meaning and spirit in a way that feels natural to native readers.

[ENGLISH TITLE]
${english.en_title}

[ENGLISH SUMMARY]
${english.en_summary}

[ENGLISH INSIGHT]
${english.en_insight}

Return ONLY this JSON (no extra text, no markdown wrapper):
{
  "ja_title": "Japanese title — catchy, natural Japanese, not a literal translation",
  "ja_summary": "Full Japanese summary preserving ## section headings — naturally written for Japanese readers",
  "ja_insight": "Japanese insight (under 150 characters)",
  "es_title": "Spanish title — catchy, natural Spanish, not a literal translation",
  "es_summary": "Full Spanish summary preserving ## section headings — naturally written for Spanish readers",
  "es_insight": "Spanish insight (under 150 characters)"
}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const text = textBlock ? textBlock.text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse translation response as JSON');

  return JSON.parse(match[0]);
}

/**
 * Main entry point: enrich and translate an article into all three languages.
 * Uses 2 Claude API calls:
 *   1. English enrichment + metadata extraction
 *   2. Simultaneous Japanese + Spanish 意訳 translation
 */
export async function translateAndEnrich(article: {
  original_title: string;
  original_content: string;
  source: string;
}): Promise<TranslationResult> {
  // --- Call 1: English enrichment ---
  const enriched = await enrichInEnglish(article);

  // If not a business case, skip the translation call entirely
  if (!enriched.is_business_case) {
    return {
      is_business_case: false,
      en_title: enriched.en_title || article.original_title,
      en_summary: enriched.en_summary || '',
      en_insight: enriched.en_insight || '',
      ja_title: '',
      ja_summary: '',
      ja_insight: '',
      es_title: '',
      es_summary: '',
      es_insight: '',
      ja_difficulty: enriched.ja_difficulty || 'Medium',
      business_model: enriched.business_model || '',
      mrr_mentioned: enriched.mrr_mentioned ?? null,
    };
  }

  // --- Call 2: Simultaneous ja + es translation ---
  const translated = await translateToJaAndEs({
    en_title: enriched.en_title,
    en_summary: enriched.en_summary,
    en_insight: enriched.en_insight,
  });

  return {
    is_business_case: true,
    en_title: enriched.en_title,
    en_summary: enriched.en_summary,
    en_insight: enriched.en_insight,
    ja_title: translated.ja_title || enriched.en_title,
    ja_summary: translated.ja_summary || enriched.en_summary,
    ja_insight: translated.ja_insight || enriched.en_insight,
    es_title: translated.es_title || enriched.en_title,
    es_summary: translated.es_summary || enriched.en_summary,
    es_insight: translated.es_insight || enriched.en_insight,
    ja_difficulty: enriched.ja_difficulty,
    business_model: enriched.business_model,
    mrr_mentioned: enriched.mrr_mentioned ?? null,
  };
}
