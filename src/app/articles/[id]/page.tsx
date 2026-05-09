'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import { useUser } from '@/components/user-context';
import { CommentsSection } from '@/components/comments-section';
import { BookmarkButton } from '@/components/bookmark-button';
import { localeToBCP47 } from '@/i18n/config';
import { formatMrr } from '@/lib/format-mrr';
import Link from 'next/link';

interface Article {
  id: string;
  source: string;
  source_type: string;
  source_url: string;
  original_url: string;
  original_title: string;
  author_profile_url: string | null;
  // English base
  en_title: string | null;
  en_summary: string | null;
  en_insight: string | null;
  en_idea_catalyst: string | null;
  // Japanese (意訳)
  ja_title: string | null;
  ja_summary: string | null;
  ja_insight: string | null;
  ja_idea_catalyst: string | null;
  // Spanish (意訳)
  es_title: string | null;
  es_summary: string | null;
  es_insight: string | null;
  es_idea_catalyst: string | null;
  ja_difficulty: string;
  business_model: string | null;
  mrr_mentioned: number | null;
  upvotes: number;
  upvote_count: number;
  view_count: number;
  is_premium: boolean;
  created_at: string;
}

interface UserProfile {
  country_code: string | null;
  country_name: string | null;
}

const sourceConfig: Record<string, { name: string; color: string; bg: string }> = {
  hackernews:   { name: 'Hacker News',   color: 'text-orange-400', bg: 'bg-transparent border-orange-400/30' },
  producthunt:  { name: 'Product Hunt',  color: 'text-red-400',    bg: 'bg-transparent border-red-400/30' },
  reddit:       { name: 'Reddit',        color: 'text-blue-400',   bg: 'bg-transparent border-blue-400/30' },
  indiehackers: { name: 'Indie Hackers', color: 'text-indigo-400', bg: 'bg-transparent border-indigo-400/30' },
};

/* ── Section heading icon SVGs ─────────────────────────────── */

function SectionIcon({ type }: { type: string }) {
  const cls = 'w-5 h-5 text-[var(--signal-gold)] flex-shrink-0';
  switch (type) {
    case 'point':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case 'product':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
    case 'revenue':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'story':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case 'tech':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      );
    case 'local':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      );
    case 'ideas':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      );
    case 'catalyst':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case 'niche':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      );
    case 'decompose':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      );
    case 'validate':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      );
  }
}

/* ── Parse structured sections ─────────────────────────────── */

interface ContentSection {
  heading: string;
  body: string;
  type: string;
}

/**
 * Match a section type from any text snippet (heading or paragraph lead).
 * Covers English, Japanese, and Spanish keywords.
 */
function guessType(text: string): string {
  // Idea Catalyst section headings
  if (/opportunity\s*was\s*discovered|how\s*this.*discovered|発見|きっかけ|c[oó]mo\s*se\s*descubri|origen/i.test(text)) return 'catalyst';
  if (/niche\s*discovery|ニッチ|niche|nicho|descubr.*nicho|finding\s*your/i.test(text)) return 'niche';
  if (/first\s*principles?\s*decompos|分解|原理|descomposici[oó]n|principios?\s*fundamental/i.test(text)) return 'decompose';
  if (/48.hour|validation\s*sprint|検証|バリデーション|sprint\s*de\s*validaci[oó]n|validar/i.test(text)) return 'validate';
  // Main summary section headings
  if (/key\s*takeaway|ポイント|事例のポイント|overview|概要|core\s*opportunity|puntos?\s*clave|conclusi[oó]n|resumen|destacado|lo\s*m[aá]s\s*importante/i.test(text)) return 'point';
  if (/what\s*was\s*built|何を作った|プロダクト|product\s*(overview|detail|created)?|qu[eé]\s*se\s*construy|producto\s*(creado|desarrollado)?|lo\s*que\s*(se\s*)?construy|el\s*producto/i.test(text)) return 'product';
  if (/how\s*(they\s*)?make\s*money|how.*earn|稼い|収益|どうやって|ingres|modelo\s*de\s*negocio|monetiz|revenue|pricing|subscription|mrr|arr/i.test(text)) return 'revenue';
  if (/journey|the\s*story|ストーリー|story|成功|経緯|recorrido|trayectoria|camino|historia|el\s*camino|el\s*viaje|timeline|started|launched|founded/i.test(text)) return 'story';
  if (/tech\s*stack|tools?\s*&?\s*stack|技術|ツール|herramienta|tecnolog[íi]|stack\s*t[eé]cnico|infrastructure/i.test(text)) return 'tech';
  if (/market\s*applicability|aplicabilidad|地域|応用|global\s*market|mercado|viabilidad|market\s*fit|worldwide|regional/i.test(text)) return 'local';
  if (/idea\s*seeds?|アイデア|semilla|idea\s*clave|apply\s*this|similar\s*idea|adjacent|spin.?off|inspiration/i.test(text)) return 'ideas';
  return 'point';
}

/**
 * Parse a summary into display sections.
 *
 * New articles (backfilled with the expanded prompt) have explicit
 * "## Section Name" markers → each marker becomes a heading + icon.
 *
 * Old articles lack those markers and contain either:
 *   • Raw scraped paragraphs  → split by blank lines, icon inferred per paragraph
 *   • A single unbroken block → render as one "point" section
 *
 * Either way every locale (EN / JA / ES) goes through the same path,
 * so the icon treatment is always identical regardless of locale.
 */
function parseSections(summary: string): ContentSection[] {
  // ── Case 1: structured content (## headings present) ──────────
  const sectionRegex = /##\s+(.+)/g;
  const matches = [...summary.matchAll(sectionRegex)];

  if (matches.length > 0) {
    const parts: ContentSection[] = [];
    let lastIndex = 0;
    let lastHeading = '';
    let lastType = 'point';

    for (const match of matches) {
      if (lastHeading) {
        const body = summary.slice(lastIndex, match.index).trim();
        if (body) parts.push({ heading: lastHeading, body, type: lastType });
      } else if (match.index && match.index > 0) {
        const preamble = summary.slice(0, match.index).trim();
        if (preamble) parts.push({ heading: '', body: preamble, type: 'point' });
      }
      lastHeading = match[1].trim()
        // Strip "(○○文字)" / "(200 words)" from headings
        .replace(/[（(]\s*\d+\s*[〜~\-]\s*\d+\s*文字\s*[）)]/g, '')
        .replace(/[（(]\s*\d+\s*文字\s*[）)]/g, '')
        .replace(/\(\s*\d+\s*words?\s*\)/gi, '')
        .trim();
      lastType = guessType(lastHeading);
      lastIndex = (match.index ?? 0) + match[0].length;
    }

    const tail = summary.slice(lastIndex).trim();
    if (tail) parts.push({ heading: lastHeading, body: tail, type: lastType });
    return parts;
  }

  // ── Case 2: unstructured content — split by blank lines ───────
  const paragraphs = summary
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 30);

  if (paragraphs.length <= 1) {
    return [{ heading: '', body: summary.trim(), type: 'point' }];
  }

  // Assign an icon type per paragraph based on its opening words.
  // This gives old articles a visual structure even without explicit headings.
  return paragraphs.map((body, i) => {
    // Inspect the first sentence / first ~120 chars for keyword matching.
    const lead = body.slice(0, 120).replace(/\*+/g, '');
    const type = i === 0 ? 'point' : guessType(lead);
    return { heading: '', body, type };
  });
}

/* ── HTML entity / tag cleaner ─────────────────────────────── */

function cleanHtml(raw: string): string {
  return raw
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    // Strip Markdown inline syntax
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [text](url) → text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')  // ![alt](url) → alt
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')              // *italic* → italic
    .replace(/`([^`]+)`/g, '$1');               // `code` → code
}

/* ── Session ID for view tracking ──────────────────────────── */

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('ir-session-id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('ir-session-id', sid);
  }
  return sid;
}

/* ── Component ─────────────────────────────────────────────── */

export default function ArticleDetailPage() {
  const { t, locale } = useI18n();
  const { userId, plan, countryCode, countryName } = useUser();
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(0);

  const [guideError, setGuideError] = useState<string | null>(null);
  const viewTracked = useRef(false);

  const canReadFull = plan === 'basic' || plan === 'pro';
  const canUseGuide = plan === 'pro';

  // Fetch article
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('id', params.id)
        .single();
      setArticle(data);
      setLocalUpvotes(data?.upvote_count || 0);
      setLoading(false);
    }
    if (params.id) load();
  }, [params.id]);

  // Track view
  useEffect(() => {
    if (!article?.id || viewTracked.current) return;
    viewTracked.current = true;
    const sid = getSessionId();
    fetch(`/api/articles/${article.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid }),
    }).catch(() => {});
  }, [article?.id]);

  // Set dynamic document title and OG meta tags
  useEffect(() => {
    if (!article) return;

    // Use locale-appropriate title for document title and OG tags
    const title =
      locale === 'ja'
        ? (article.ja_title || article.en_title || article.original_title || '')
        : locale === 'es'
        ? (article.es_title || article.en_title || article.original_title || '')
        : (article.en_title || article.original_title || '');

    if (title) {
      document.title = `${title} | IndieRadar`;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indieradar.jp';
    const ogImageUrl = `${appUrl}/api/og?title=${encodeURIComponent(title)}`;
    const pageUrl = `${appUrl}/articles/${article.id}`;
    const description = (summaryContent || '').slice(0, 150);

    // Helper to set or create a meta tag
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setMetaName = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', ogImageUrl);
    setMeta('og:url', pageUrl);
    setMeta('og:type', 'article');
    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', title);
    setMetaName('twitter:description', description);
    setMetaName('twitter:image', ogImageUrl);
  }, [article, locale]);

  // JSON-LD is now injected server-side in layout.tsx for reliable crawler indexing.

  // Check vote status
  useEffect(() => {
    if (!userId || !article?.id) return;
    fetch(`/api/articles/${article.id}/vote?user_id=${userId}`)
      .then((r) => r.json())
      .then((d) => setHasVoted(d.voted))
      .catch(() => {});
  }, [userId, article?.id]);

  const handleVote = useCallback(async () => {
    if (!userId || !article) return;
    const res = await fetch(`/api/articles/${article.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json();
    if (data.action === 'added') {
      setHasVoted(true);
      setLocalUpvotes((v) => v + 1);
    } else {
      setHasVoted(false);
      setLocalUpvotes((v) => Math.max(0, v - 1));
    }
  }, [userId, article]);

  const handleGenerateGuide = useCallback(async () => {
    if (!userId || !article || !canUseGuide) return;
    setPromptLoading(true);
    setGuideError(null);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 150000); // 2.5 min timeout
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: article.id,
          user_id: userId,
          country_name: countryName || null,
          country_code: countryCode || null,
          locale: locale,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (res.ok) {
        // Strip "(○○文字)" / "(200 words)" etc. from section headings
        const cleaned = (data.prompt as string).replace(/[（(]\s*\d+\s*[〜~\-]\s*\d+\s*文字\s*[）)]/g, '').replace(/[（(]\s*\d+\s*文字\s*[）)]/g, '').replace(/\(\s*\d+\s*words?\s*\)/gi, '');
        setPrompt(cleaned);
      }
      else setGuideError(data.error || t.common.error_load);
    } catch {
      setGuideError(t.common.error_network);
    }
    setPromptLoading(false);
  }, [userId, article, countryName, countryCode, locale, canUseGuide]);


  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="skeleton h-10 w-full mb-4 rounded-xl" />
        <div className="skeleton h-6 w-3/4 mb-3" />
        <div className="skeleton h-48 w-full rounded-xl mb-4" />
        <div className="skeleton h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 animate-fade-in">
        <div className="text-center">
          <p className="text-[var(--ink-5)] text-lg mb-3">{t.articles.empty}</p>
          <Link href="/articles" className="text-[var(--signal-gold)] font-medium hover:text-[var(--signal-gold)]/80">
            {t.common.back_to_articles}
          </Link>
        </div>
      </div>
    );
  }

  const src = sourceConfig[article.source] || { name: article.source, color: 'text-[var(--ink-5)]', bg: 'bg-transparent border-[var(--ink-2)]' };
  const sourceUrl = article.source_url || article.original_url;
  const sourceDomain = (() => {
    try { return new URL(sourceUrl).hostname; } catch { return sourceUrl; }
  })();
  // Show "via Platform" when the content URL doesn't belong to the discovery platform
  const platformDomains: Record<string, string> = {
    hackernews: 'ycombinator.com',
    producthunt: 'producthunt.com',
    reddit: 'reddit.com',
    indiehackers: 'indiehackers.com',
  };
  const showVia = article.source && platformDomains[article.source] &&
    !sourceDomain.includes(platformDomains[article.source]);
  // Trilingual content selection — all content is pre-stored in DB, no live API calls.
  // English locale: en_title is always set (= original_title for old articles).
  // Spanish: fall back to en_title, then original_title.
  const displayTitle =
    locale === 'ja'
      ? (article.ja_title || article.en_title || article.original_title || '')
      : locale === 'es'
      ? (article.es_title || article.en_title || article.original_title || '')
      : (article.en_title || article.original_title || '');

  // Non-Japanese locales must NOT fall back to ja_* — showing Japanese text to
  // English/Spanish readers is worse than an empty section.
  const rawSummary =
    locale === 'ja'
      ? (article.ja_summary || article.en_summary || '')
      : locale === 'es'
      ? (article.es_summary || article.en_summary || '')
      : (article.en_summary || '');

  // Clean HTML tags + decode entities (en_summary may contain raw HTML from original_content)
  const summaryContent = rawSummary ? cleanHtml(rawSummary) : '';

  const rawInsight =
    locale === 'ja'
      ? (article.ja_insight || article.en_insight || '')
      : locale === 'es'
      ? (article.es_insight || article.en_insight || '')
      : (article.en_insight || '');

  const insightContent = rawInsight ? cleanHtml(rawInsight) : '';

  // Idea Catalyst content (BASIC+ gated)
  const rawCatalyst =
    locale === 'ja'
      ? (article.ja_idea_catalyst || article.en_idea_catalyst || '')
      : locale === 'es'
      ? (article.es_idea_catalyst || article.en_idea_catalyst || '')
      : (article.en_idea_catalyst || '');
  const catalystContent = rawCatalyst
    ? cleanHtml(rawCatalyst)
        // Strip "(○○文字)" / "(200〜300文字)" / "(200 words)" from section headings
        .replace(/[（(]\s*\d+\s*[〜~\-]\s*\d+\s*文字\s*[）)]/g, '')
        .replace(/[（(]\s*\d+\s*文字\s*[）)]/g, '')
        .replace(/\(\s*\d+\s*words?\s*\)/gi, '')
    : '';
  const catalystSections = catalystContent ? parseSections(catalystContent) : [];

  // Character-count-based gating: free users see first ~35% of content
  // regardless of whether the summary uses ## headings or not.
  // This ensures EN, JA, and ES are gated identically.
  const FREE_CHAR_LIMIT = 900;
  const isContentTruncated = !canReadFull && summaryContent.length > FREE_CHAR_LIMIT;
  const visibleSummary = isContentTruncated
    ? summaryContent.slice(0, FREE_CHAR_LIMIT)
    : summaryContent;
  const sections = parseSections(visibleSummary);
  // When content IS truncated, also compute blurred preview from the hidden part
  const hiddenPreview = isContentTruncated
    ? summaryContent.slice(FREE_CHAR_LIMIT, FREE_CHAR_LIMIT + 400)
    : '';

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 animate-fade-in">
      {/* ── Source attribution ────────────────────────────────── */}
      <div className="bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-xl p-3.5 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-[var(--paper-1)] flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-[var(--ink-5)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            <span className="font-medium flex-shrink-0">{t.articles.source_label}</span>
            <span className="truncate">{sourceDomain}</span>
            {showVia && (
              <span className="text-xs text-[var(--ink-4)] flex-shrink-0">
                via {src.name}
              </span>
            )}
          </div>
          <a
            href={sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm text-[var(--signal-gold)] font-medium hover:opacity-80 transition flex items-center gap-1 flex-shrink-0"
          >
            {t.articles.read_original}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </a>
        </div>
        <p className="text-xs text-[var(--ink-5)] mt-1.5 sm:mt-0 hidden sm:block">{t.articles.ai_disclaimer}</p>
      </div>

      {/* ── Tags + Stats ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${src.bg} ${src.color}`}>
          {src.name}
        </span>
        {article.ja_difficulty && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            article.ja_difficulty === 'Easy' ? 'bg-transparent border-emerald-400/30 text-emerald-400'
            : article.ja_difficulty === 'Medium' ? 'bg-transparent border-amber-400/30 text-amber-400'
            : 'bg-transparent border-red-400/30 text-red-400'
          }`}>
            {article.ja_difficulty === 'Easy' ? t.articles.diff_easy
              : article.ja_difficulty === 'Medium' ? t.articles.diff_medium
              : article.ja_difficulty === 'Hard' ? t.articles.diff_hard
              : article.ja_difficulty}
          </span>
        )}
        {article.business_model && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-transparent border-[var(--ink-3)] text-[var(--paper-1)]">
            {article.business_model}
          </span>
        )}
        {article.mrr_mentioned != null && article.mrr_mentioned > 0 && (
          <span className="text-xs font-bold text-emerald-400 bg-transparent border border-emerald-400/30 px-2.5 py-1 rounded-full">
            {formatMrr(article.mrr_mentioned)}/mo
          </span>
        )}

        {/* Stats */}
        <div className="ml-auto flex items-center gap-3">
          {/* Views */}
          <span className="text-xs text-[var(--ink-5)] flex items-center gap-1" title="Views">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {article.view_count || 0}
          </span>

          {/* Upvote button */}
          <button
            onClick={handleVote}
            disabled={!userId}
            title={userId ? (hasVoted ? 'Remove vote' : 'Upvote') : 'Login to vote'}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all ${
              hasVoted
                ? 'border-[var(--signal-gold)] text-[var(--signal-gold)] bg-[rgba(212,162,74,0.1)]'
                : 'border-[var(--ink-3)] text-[var(--ink-5)] hover:border-[var(--ink-4)] hover:text-[var(--paper-2)]'
            } ${!userId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <svg className="w-3.5 h-3.5" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            {localUpvotes}
          </button>

          {/* Bookmark button */}
          <BookmarkButton articleId={article.id} />
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────── */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--paper-3)] mb-6 leading-snug">
        {displayTitle}
      </h1>

      {/* ── Structured Content Sections ──────────────────────── */}
      <div className="space-y-6 mb-8">
        {sections.map((section, i) => (
          <div key={i}>
            {/* Named heading (new-format articles with ## markers) */}
            {section.heading ? (
              <div className="flex items-center gap-2 mb-2">
                <SectionIcon type={section.type} />
                <h2 className="text-lg font-bold text-[var(--paper-3)]" style={{ fontFamily: 'var(--font-display)' }}>
                  {section.heading}
                </h2>
              </div>
            ) : (
              /* Icon-only row for paragraph-mode sections (old-format content) */
              sections.length > 1 && (
                <div className="flex items-center gap-2 mb-1.5">
                  <SectionIcon type={section.type} />
                </div>
              )
            )}
            <div className={`text-[var(--paper-1)] leading-relaxed text-[15px] whitespace-pre-line ${section.heading || sections.length > 1 ? 'pl-0 sm:pl-7' : 'pl-0'}`}>
              {section.body}
            </div>
          </div>
        ))}
      </div>

      {/* ── Paywall Gate (Free users — content truncated at ~35%) ── */}
      {isContentTruncated && (
        <div className="relative mb-8">
          {/* Blurred preview hint */}
          <div className="relative overflow-hidden rounded-2xl" style={{ maxHeight: '120px' }}>
            <div className="text-[var(--paper-1)] leading-relaxed text-[15px] whitespace-pre-line opacity-40" style={{ filter: 'blur(4px)', userSelect: 'none' }}>
              {hiddenPreview}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--ink-0)]/60 to-[var(--ink-0)]" />
          </div>

          {/* CTA */}
          <div className="border border-[var(--signal-gold)]/30 bg-[rgba(212,162,74,0.06)] rounded-2xl p-6 mt-3 text-center">
            <svg className="w-8 h-8 text-[var(--signal-gold)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <h3 className="text-lg font-bold text-[var(--paper-3)] mb-2">{t.detail.paywall_title}</h3>
            <p className="text-sm text-[var(--ink-5)] mb-5 max-w-md mx-auto">{t.detail.paywall_desc}</p>
            <div className="flex items-center justify-center gap-3">
              {!userId ? (
                <Link
                  href="/auth/login"
                  className="bg-[var(--signal-gold)] text-[var(--ink-0)] px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition rounded-xl"
                >
                  {t.detail.paywall_login}
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="bg-[var(--signal-gold)] text-[var(--ink-0)] px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition rounded-xl"
                >
                  {t.detail.paywall_button}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Author profile link (paid only) ──────────────────── */}
      {canReadFull && article.author_profile_url && (
        <div className="bg-[var(--ink-1)] rounded-xl p-3 mb-6 text-sm border border-[var(--ink-2)] flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--ink-5)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
          <a href={article.author_profile_url} target="_blank" rel="noopener noreferrer" className="text-[var(--signal-gold)] hover:opacity-80 transition truncate">
            {t.detail.author_label} →
          </a>
        </div>
      )}

      {/* ── Idea Catalyst (BASIC+ only) ────────────────────── */}
      {canReadFull && catalystSections.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[var(--paper-3)]" style={{ fontFamily: 'var(--font-display)' }}>
              {t.detail.catalyst_heading}
            </h2>
          </div>
          <div className="bg-gradient-to-br from-[rgba(245,158,11,0.04)] to-transparent rounded-2xl border border-amber-500/15 p-5 sm:p-6">
            <div className="space-y-5">
              {catalystSections.map((section, i) => (
                <div key={i}>
                  {section.heading && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <SectionIcon type={section.type} />
                      <h3 className="text-[15px] font-bold text-[var(--paper-3)]">
                        {section.heading}
                      </h3>
                    </div>
                  )}
                  <div className="text-[var(--paper-1)] leading-relaxed text-[15px] whitespace-pre-line pl-0 sm:pl-7">
                    {section.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Global Insight (paid only) ───────────────────────── */}
      {canReadFull && insightContent && (
        <div className="bg-gradient-to-r from-[rgba(212,162,74,0.08)] to-transparent rounded-2xl p-5 mb-6 border border-[rgba(212,162,74,0.2)]">
          <p className="text-sm font-bold text-[var(--signal-gold)] mb-1.5 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
            </svg>
            {t.detail.insight_heading}
          </p>
          <p className="text-sm text-[var(--paper-1)] leading-relaxed">{insightContent}</p>
        </div>
      )}

      {/* ── Country-specific context (paid only) ─────────────── */}
      {canReadFull && countryName && (
        <div className="bg-gradient-to-r from-[rgba(99,102,241,0.08)] to-transparent rounded-2xl p-5 mb-6 border border-[rgba(99,102,241,0.2)]">
          <p className="text-sm font-bold text-indigo-400 mb-1.5 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {t.detail.country_context_heading}
          </p>
          <p className="text-sm text-[var(--paper-1)] leading-relaxed">{t.detail.country_context_desc}</p>
        </div>
      )}

      {/* ── AI Guide Section ─────────────────────────────────── */}
      <div className="border border-[var(--ink-2)] rounded-2xl p-6 mb-6 bg-[var(--ink-1)]">
        <h2 className="text-lg font-bold text-[var(--paper-3)] mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--signal-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          {t.detail.guide_heading}
        </h2>

        {!userId ? (
          /* Not logged in */
          <div>
            <p className="text-sm text-[var(--ink-5)] mb-4">{t.detail.guide_login_desc}</p>
            <Link href="/auth/login" className="inline-flex items-center gap-2 rounded-xl bg-[var(--signal-gold)] px-6 py-2.5 text-[var(--ink-0)] text-sm font-medium hover:opacity-90 transition">
              {t.detail.guide_login_button}
            </Link>
          </div>
        ) : !canUseGuide ? (
          /* Logged in but not Pro */
          <div>
            <p className="text-sm text-[var(--ink-5)] mb-2">{t.detail.upgrade_pro_desc}</p>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-[var(--signal-gold)]/40 bg-[rgba(212,162,74,0.08)] px-6 py-2.5 text-[var(--signal-gold)] text-sm font-medium hover:bg-[rgba(212,162,74,0.15)] transition">
              {t.detail.upgrade_pro_button}
            </Link>
          </div>
        ) : prompt ? (
          /* Pro with generated prompt */
          <div className="bg-[var(--ink-0)] rounded-xl p-5 text-sm text-[var(--paper-1)] whitespace-pre-wrap leading-relaxed border border-[var(--ink-2)] max-h-[600px] overflow-y-auto">
            {prompt}
          </div>
        ) : (
          /* Pro, ready to generate */
          <div>
            <p className="text-sm text-[var(--ink-5)] mb-4">{t.detail.guide_desc}</p>
            {guideError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H2.645c-1.73 0-2.813-1.874-1.948-3.374L10.051 3.378c.866-1.5 3.032-1.5 3.898 0L21.303 16.126z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{guideError}</span>
              </div>
            )}
            <button
              onClick={handleGenerateGuide} disabled={promptLoading}
              className="rounded-xl bg-[var(--signal-gold)] px-6 py-3 text-[var(--ink-0)] text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {promptLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.detail.guide_generating}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {t.detail.guide_button}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Comments Section ─────────────────────────────────── */}
      <CommentsSection articleId={article.id} />

      {/* ── Bottom nav ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-5 border-t border-[var(--ink-2)]">
        <span className="text-xs text-[var(--ink-5)]">
          {new Date(article.created_at).toLocaleDateString(localeToBCP47[locale])}
        </span>
        <Link href="/articles" className="text-sm text-[var(--signal-gold)] font-medium hover:opacity-80 transition flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t.common.back_to_articles}
        </Link>
      </div>
    </div>
  );
}
