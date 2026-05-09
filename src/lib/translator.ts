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
  en_idea_catalyst: string;
  // Japanese (意訳 — contextual translation)
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_idea_catalyst: string;
  // Spanish (意訳 — contextual translation)
  es_title: string;
  es_summary: string;
  es_insight: string;
  es_idea_catalyst: string;
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

/* ------------------------------------------------------------------ */
/*  Quality validation helpers                                         */
/* ------------------------------------------------------------------ */

const REQUIRED_SUMMARY_SECTIONS = [
  '## Key Takeaways',
  '## What Was Built',
  '## How They Make Money',
  '## The Journey',
  '## Tech Stack & Tools',
  '## Market Applicability',
  '## Idea Seeds',
] as const;

const REQUIRED_CATALYST_SECTIONS = [
  '## How This Opportunity Was Discovered',
  '## Niche Discovery Framework',
  '## First Principles Decomposition',
  "## Your 48-Hour Validation Sprint",
] as const;

/** Minimum character thresholds — relaxed for short source articles */
function getMinThresholds(sourceLength: number) {
  // Short source (<800 chars): lower expectations
  if (sourceLength < 800) {
    return { summaryMin: 1500, catalystMin: 600 };
  }
  // Medium source (800-2000): moderate expectations
  if (sourceLength < 2000) {
    return { summaryMin: 2500, catalystMin: 800 };
  }
  // Full source: full expectations
  return { summaryMin: 3000, catalystMin: 1000 };
}

export interface QualityReport {
  passed: boolean;
  missingSummarySections: string[];
  missingCatalystSections: string[];
  summaryLength: number;
  catalystLength: number;
  issues: string[];
}

/**
 * Validate enrichment output meets quality standards.
 * Returns a report indicating pass/fail and specific issues.
 */
export function validateEnrichmentQuality(
  result: { en_summary: string; en_idea_catalyst: string; is_business_case: boolean },
  sourceLength: number,
): QualityReport {
  // Non-business cases skip validation
  if (!result.is_business_case) {
    return { passed: true, missingSummarySections: [], missingCatalystSections: [], summaryLength: 0, catalystLength: 0, issues: [] };
  }

  const issues: string[] = [];
  const thresholds = getMinThresholds(sourceLength);

  // Check summary sections
  const missingSummarySections = REQUIRED_SUMMARY_SECTIONS.filter(
    (s) => !result.en_summary.includes(s),
  );
  if (missingSummarySections.length > 0) {
    issues.push(`Missing ${missingSummarySections.length}/7 summary sections: ${missingSummarySections.join(', ')}`);
  }

  // Check catalyst sections
  const missingCatalystSections = REQUIRED_CATALYST_SECTIONS.filter(
    (s) => !result.en_idea_catalyst?.includes(s),
  );
  if (missingCatalystSections.length > 0) {
    issues.push(`Missing ${missingCatalystSections.length}/4 catalyst sections: ${missingCatalystSections.join(', ')}`);
  }

  // Check lengths
  const summaryLength = result.en_summary?.length ?? 0;
  const catalystLength = result.en_idea_catalyst?.length ?? 0;

  if (summaryLength < thresholds.summaryMin) {
    issues.push(`en_summary too short: ${summaryLength} < ${thresholds.summaryMin}`);
  }
  if (catalystLength < thresholds.catalystMin) {
    issues.push(`en_idea_catalyst too short: ${catalystLength} < ${thresholds.catalystMin}`);
  }

  // Pass = no missing sections AND lengths OK
  const passed = missingSummarySections.length === 0
    && missingCatalystSections.length === 0
    && summaryLength >= thresholds.summaryMin
    && catalystLength >= thresholds.catalystMin;

  return { passed, missingSummarySections, missingCatalystSections, summaryLength, catalystLength, issues };
}

/**
 * Quick check if an existing article has the expected 7-section structure.
 * Used by backfill to prioritize re-enrichment of low-quality articles.
 */
export function hasQualitySections(enSummary: string | null): boolean {
  if (!enSummary) return false;
  const present = REQUIRED_SUMMARY_SECTIONS.filter((s) => enSummary.includes(s));
  return present.length >= 6; // allow 1 missing section as acceptable
}

/* ------------------------------------------------------------------ */
/*  CALL 1: Enrich article in English                                  */
/* ------------------------------------------------------------------ */

const MAX_ENRICH_RETRIES = 2;

/**
 * CALL 1: Enrich article in English.
 * Returns all metadata + English content fields.
 * Includes automatic quality validation and retry (up to 2 retries).
 * Exported so backfill routes can call it independently of the translation step.
 */
export async function enrichInEnglish(article: {
  original_title: string;
  original_content: string;
  source: string;
}): Promise<{
  is_business_case: boolean;
  en_title: string;
  en_summary: string;
  en_insight: string;
  en_idea_catalyst: string;
  ja_difficulty: 'Easy' | 'Medium' | 'Hard';
  business_model: string;
  mrr_mentioned: number | null;
}> {
  const globalContext = buildGlobalMarketContext();
  const industryHints = buildIndustryHints();
  const sourceLength = article.original_content.length;

  let lastResult: Awaited<ReturnType<typeof enrichInEnglish>> | null = null;
  let lastReport: QualityReport | null = null;

  for (let attempt = 0; attempt <= MAX_ENRICH_RETRIES; attempt++) {
    // Build retry hint for subsequent attempts
    const retryHint = attempt > 0 && lastReport
      ? `\n\n[QUALITY RETRY — attempt ${attempt + 1}]\nPrevious output FAILED validation. Fix these issues:\n${lastReport.issues.map(i => `- ${i}`).join('\n')}\nEnsure ALL 7 summary sections and ALL 4 idea_catalyst sections are present with proper "## Section Name" headings.\n`
      : '';

    const result = await callEnrichAPI(article, globalContext, industryHints, retryHint);

    // Non-business cases pass immediately
    if (!result.is_business_case) return result;

    const report = validateEnrichmentQuality(result, sourceLength);
    if (report.passed) return result;

    // Log the quality failure
    console.warn(
      `[enrichInEnglish] Quality check failed (attempt ${attempt + 1}/${MAX_ENRICH_RETRIES + 1}) for "${article.original_title.slice(0, 50)}": ${report.issues.join('; ')}`,
    );

    lastResult = result;
    lastReport = report;
  }

  // All retries exhausted — return best attempt with a warning
  console.warn(
    `[enrichInEnglish] All ${MAX_ENRICH_RETRIES + 1} attempts failed quality check for "${article.original_title.slice(0, 50)}". Using last result.`,
  );
  return lastResult!;
}

/**
 * Internal: single Claude API call for enrichment.
 */
async function callEnrichAPI(
  article: { original_title: string; original_content: string; source: string },
  globalContext: string,
  industryHints: string,
  retryHint: string,
): Promise<{
  is_business_case: boolean;
  en_title: string;
  en_summary: string;
  en_insight: string;
  en_idea_catalyst: string;
  ja_difficulty: 'Easy' | 'Medium' | 'Hard';
  business_model: string;
  mrr_mentioned: number | null;
}> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 10000,
    system: `You are a business analyst with Perplexity AI-level market analysis capabilities.
Analyze indie hacker case studies and provide deep insights on global market applicability.
Include data-driven specific numbers, market sizes, and success probabilities.
Write in clear, accessible English that beginners can understand, while providing deep insights.`,
    messages: [
      {
        role: 'user',
        content: `Analyze the following indie hacker post and return JSON.
Write with DEPTH and DENSITY — every section should be packed with concrete details, specific numbers, and actionable insights.
Write clearly enough that a beginner can understand while still delivering expert-level analysis.

[GLOBAL MARKET DATA (reference)]
${globalContext}

[APPLICABLE INDUSTRIES]
${industryHints}

[ANALYSIS RULES]
en_summary MUST total 3500-5000 characters. Be thorough, specific, and information-dense throughout.
Structure with exactly 7 sections using "## Section Name" format.
CRITICAL: Do NOT include character counts like "(300 chars)" in section headings. Output clean headings only.

## Key Takeaways
- 2-3 sentences capturing why this case is remarkable and what makes it replicable
- Lead with the most impressive metric (MRR, growth rate, user count, time-to-revenue)
- Include one "counterintuitive" insight that surprises even experienced indie hackers

## What Was Built
- Full product description: what it does, what problem it replaces, how users interact with it daily
- Detailed target user persona: job title, frustration, how they found the product
- Before/After: quantify the pain (hours saved, money saved, revenue gained)
- TAM estimate with methodology: bottom-up calculation with supporting data
- Concrete example: walk through one user's experience from problem to solution
- Why this is hard to replicate naively (the non-obvious insight)

## How They Make Money
- Complete pricing structure: every tier, what's included, why each tier exists
- Revenue breakdown if available (# of free vs paid, conversion rate, churn rate)
- Acquisition channel deep-dive: top 2-3 channels, estimated % of traffic, CAC per channel
- Full unit economics: LTV calculation, payback period, gross margin estimate
- Pricing strategy analysis: why this price works (anchoring, value metric, competitor gap)
- "Beginner translation": explain the business model in simple terms with an analogy

## The Journey
- Detailed chronological timeline: months/years, key milestones, revenue inflection points
- First customer story: how did they land customer #1? What did it take?
- Biggest failure or near-death experience: what went wrong and what was learned
- The turning point: single decision or discovery that changed everything
- 3 key learning points explicitly labeled — lessons that apply broadly
- Comparison to similar cases: what makes this one different from similar attempts?
- What they would do differently if starting over today

## Tech Stack & Tools
- Complete tool list including inferred infrastructure choices
- Each tool: name + one-line explanation + why this tool specifically (not alternatives)
- Estimated monthly costs at their current scale (hosting, APIs, SaaS tools)
- Build vs buy decisions: what they custom-built and why
- 2-3 alternative stacks for different skill sets/budgets
- Time investment: how long did technical setup take?

## Market Applicability
Perplexity-level market intelligence:
- Global applicability score: ★1-5 with detailed reasoning
- Market-by-market feasibility: Japan / US / Europe / SE Asia / India / LATAM — one detailed line each including market size, regulatory notes, and local competition
- Most promising expansion market: specific analysis with data points
- Regulatory/legal barriers: any compliance requirements, payment restrictions, data laws
- Localization checklist: language, payment methods, cultural adaptations, marketing channels
- Competitive landscape: who already does this globally? What's the gap?
- Concrete 90-day action plan for someone starting in their country today

## Idea Seeds
- Core mechanism in one sentence (the abstracted pattern)
- 5 application ideas using this mechanism in different industries
  Format per idea: [Target User] + [Problem] + [Solution using mechanism] + [Estimated MRR range] + [Key risk]
- Mark ★ on the lowest-risk starting idea
- Mark ★★ on the highest-upside idea
- "Adjacent pivot" idea: what happens if you take this exact product and change just the target market?
- Anti-idea: one thing that sounds like it would work but probably won't, and why

[IDEA CATALYST — en_idea_catalyst field]
en_idea_catalyst MUST total 1500-2500 characters. This is NOT a copy of the analysis above.
It is a standalone creative-thinking guide that helps readers INVENT THEIR OWN IDEAS inspired by this case.
Structure with exactly 4 sections using "## Section Name" format:

## How This Opportunity Was Discovered
- Reverse-engineer the founder's "aha moment": what specific signal, frustration, or observation sparked this idea?
- What market signal or user complaint pattern would have led YOU to the same discovery?
- The general "trigger pattern" — e.g., "noticing professionals still using spreadsheets for X"

## Niche Discovery Framework
- 3 concrete methods to find similar underserved niches TODAY (not generic advice — specific actions):
  Method 1: [Where to look] + [What signal to watch for] + [Concrete example of a niche you'd find]
  Method 2: [Community/forum to monitor] + [Type of complaint that signals opportunity]
  Method 3: [Data source or tool] + [How to use it to spot gaps]
- "The niche is too small" myth: why the founder succeeded BECAUSE the niche was small

## First Principles Decomposition
- Strip away the industry: what is the ABSTRACT MECHANISM that makes this business work?
  Express as: "[Type of person] has [recurring problem] → this product [transforms X into Y] → they pay because [value proposition]"
- Now apply YOUR expertise: if you know [field A], the same mechanism becomes [specific idea]
- If you know [field B], it becomes [different specific idea]
- The "10x test": would a user pay 10x the current price if it saved them 10x more time? If yes, the mechanism is robust.

## Your 48-Hour Validation Sprint
- Day 1 Morning: Find 5 potential users (where to find them, what to search for, exact communities)
- Day 1 Afternoon: Ask ONE question (the exact question phrasing that validates demand — not "would you use X?" but the right way to ask)
- Day 2: Build a no-code landing page in 2 hours (which tool, what to put on it, what CTA)
- Success signal: the specific number/response that means "go" vs. "pivot"
- Kill signal: what tells you to abandon this niche immediately

[About en_insight]
- 1 sentence of global applicability insight in 150 characters or less
- Must include a specific market size, growth rate, or success rate statistic
- Should apply to readers in any country, not just one market

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
  "en_idea_catalyst": "## How This Opportunity Was Discovered\\n...\\n\\n## Niche Discovery Framework\\n...\\n\\n## First Principles Decomposition\\n...\\n\\n## Your 48-Hour Validation Sprint\\n...",
  "en_insight": "Global applicability insight (under 150 chars, include market data)",
  "ja_difficulty": "Easy or Medium or Hard",
  "business_model": "Business model name (e.g., SaaS, Marketplace, Chrome Extension, API)",
  "mrr_mentioned": MRR amount as integer in USD (null if no revenue mentioned in article)
}${retryHint}`,
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
 * Exported so backfill routes can call it independently of the enrichment step.
 * Uses 意訳 (contextual/adaptive translation) — not literal word-for-word.
 * Returns translated title, summary, and insight for both languages.
 */
export async function translateToJaAndEs(english: {
  en_title: string;
  en_summary: string;
  en_insight: string;
  en_idea_catalyst?: string;
}): Promise<{
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_idea_catalyst: string;
  es_title: string;
  es_summary: string;
  es_insight: string;
  es_idea_catalyst: string;
}> {
  const catalystBlock = english.en_idea_catalyst
    ? `\n\n[ENGLISH IDEA CATALYST]\n${english.en_idea_catalyst}`
    : '';
  const catalystJsonHint = english.en_idea_catalyst
    ? `,
  "ja_idea_catalyst": "Complete Japanese idea catalyst — same length and depth, preserving all ## section headings",
  "es_idea_catalyst": "Complete Spanish idea catalyst — same length and depth, preserving all ## section headings"`
    : `,
  "ja_idea_catalyst": "",
  "es_idea_catalyst": ""`;

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 12000,
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
Both translations must be 意訳 — deeply understand the meaning and restructure naturally for each language.
Do NOT shorten, summarize, or omit any content. The translated versions must match the original in length and depth.
Every data point, example, metric, and insight from the English MUST appear in both translations.

[ENGLISH TITLE]
${english.en_title}

[ENGLISH SUMMARY]
${english.en_summary}

[ENGLISH INSIGHT]
${english.en_insight}${catalystBlock}

Return ONLY this JSON (no extra text, no markdown wrapper):
{
  "ja_title": "Japanese title — catchy, natural Japanese, not a literal translation",
  "ja_summary": "Complete Japanese summary — same length and depth as the English, preserving all ## section headings",
  "ja_insight": "Japanese insight (under 150 characters)"${catalystJsonHint},
  "es_title": "Spanish title — catchy, natural Spanish, not a literal translation",
  "es_summary": "Complete Spanish summary — same length and depth as the English, preserving all ## section headings",
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
      en_idea_catalyst: '',
      ja_title: '',
      ja_summary: '',
      ja_insight: '',
      ja_idea_catalyst: '',
      es_title: '',
      es_summary: '',
      es_insight: '',
      es_idea_catalyst: '',
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
    en_idea_catalyst: enriched.en_idea_catalyst,
  });

  return {
    is_business_case: true,
    en_title: enriched.en_title,
    en_summary: enriched.en_summary,
    en_insight: enriched.en_insight,
    en_idea_catalyst: enriched.en_idea_catalyst || '',
    ja_title: translated.ja_title || enriched.en_title,
    ja_summary: translated.ja_summary || enriched.en_summary,
    ja_insight: translated.ja_insight || enriched.en_insight,
    ja_idea_catalyst: translated.ja_idea_catalyst || enriched.en_idea_catalyst || '',
    es_title: translated.es_title || enriched.en_title,
    es_summary: translated.es_summary || enriched.en_summary,
    es_insight: translated.es_insight || enriched.en_insight,
    es_idea_catalyst: translated.es_idea_catalyst || enriched.en_idea_catalyst || '',
    ja_difficulty: enriched.ja_difficulty,
    business_model: enriched.business_model,
    mrr_mentioned: enriched.mrr_mentioned ?? null,
  };
}
