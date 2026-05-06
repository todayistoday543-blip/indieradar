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

export async function translateAndEnrich(article: {
  original_title: string;
  original_content: string;
  source: string;
}): Promise<TranslationResult> {
  const globalContext = buildGlobalMarketContext();
  const industryHints = buildIndustryHints();

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 6000,
    system: `You are a business analyst with Perplexity AI-level market analysis capabilities.
Analyze indie hacker case studies and provide deep insights on global market applicability.
Include data-driven specific numbers, market sizes, and success probabilities.
Write in clear, accessible English that beginners can understand, while providing deep insights.`,
    messages: [
      {
        role: 'user',
        content: `Analyze the following indie hacker post and return JSON format.
Write clearly and concretely so beginners in programming or business can understand.

[GLOBAL MARKET DATA (reference)]
${globalContext}

[APPLICABLE INDUSTRIES]
${industryHints}

[ANALYSIS RULES]
ja_summary should total 2500-3500 characters, structured with 7 sections in "## Section Name" format:

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

[About ja_insight]
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
  "ja_title": "English title (under 80 chars, catchy with numbers if available)",
  "ja_summary": "## Key Takeaways\\n...\\n\\n## What Was Built\\n...\\n\\n## How They Make Money\\n...\\n\\n## The Journey\\n...\\n\\n## Tech Stack & Tools\\n...\\n\\n## Market Applicability\\n...\\n\\n## Idea Seeds\\n...",
  "ja_insight": "Global applicability insight (under 150 chars, include market data)",
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
  if (!match) {
    throw new Error('Failed to parse Claude response as JSON');
  }

  return JSON.parse(match[0]) as TranslationResult;
}
