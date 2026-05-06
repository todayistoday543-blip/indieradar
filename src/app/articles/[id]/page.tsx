'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import { useUser } from '@/components/user-context';
import { CommentsSection } from '@/components/comments-section';
import { BookmarkButton } from '@/components/bookmark-button';
import BusinessPlanModal from '@/components/business-plan-modal';
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
  // Japanese (意訳)
  ja_title: string | null;
  ja_summary: string | null;
  ja_insight: string | null;
  // Spanish (意訳)
  es_title: string | null;
  es_summary: string | null;
  es_insight: string | null;
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
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      );
  }
}

/* ── Parse structured sections from ja_summary ─────────────── */

interface ContentSection {
  heading: string;
  body: string;
  type: string;
}

function parseSections(summary: string): ContentSection[] {
  const sectionRegex = /##\s+(.+)/g;
  const parts: ContentSection[] = [];
  let lastIndex = 0;
  let lastHeading = '';
  let lastType = 'point';
  const matches = [...summary.matchAll(sectionRegex)];

  if (matches.length === 0) {
    return [{ heading: '', body: summary.trim(), type: 'point' }];
  }

  for (const match of matches) {
    if (lastHeading) {
      const body = summary.slice(lastIndex, match.index).trim();
      if (body) parts.push({ heading: lastHeading, body, type: lastType });
    } else if (match.index && match.index > 0) {
      const preamble = summary.slice(0, match.index).trim();
      if (preamble) parts.push({ heading: '', body: preamble, type: 'point' });
    }
    lastHeading = match[1].trim();
    lastType = guessType(lastHeading);
    lastIndex = (match.index ?? 0) + match[0].length;
  }

  const tail = summary.slice(lastIndex).trim();
  if (tail) parts.push({ heading: lastHeading, body: tail, type: lastType });

  return parts;
}

function guessType(heading: string): string {
  // English + Japanese + Spanish keywords
  if (/key takeaway|ポイント|point|overview|概要|core opportunity|puntos?\s*clave|conclusi[oó]n|resumen/i.test(heading)) return 'point';
  if (/what was built|何を作った|product|作った|プロダクト|qu[eé]\s*se\s*construy|producto\s*creado|lo\s*que\s*construy/i.test(heading)) return 'product';
  if (/how they make money|how.*mak.*money|稼い|revenue|収益|どうやって|c[oó]mo.*ingres|modelo\s*de\s*negocio|monetiz/i.test(heading)) return 'revenue';
  if (/journey|ストーリー|story|成功|経緯|camino|historia|trayectoria|recorrido/i.test(heading)) return 'story';
  if (/tech stack|技術|tech|stack|ツール|tool|herramienta|tecnolog[íi]/i.test(heading)) return 'tech';
  if (/market applicability|地域|応用|local|country|あなた|aplicabilidad|mercado|viabilidad/i.test(heading)) return 'local';
  if (/idea seeds|アイデア|ideas|ヒント|hint|semilla|idea\s*clave/i.test(heading)) return 'ideas';
  return 'point';
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
  const [businessPlanOpen, setBusinessPlanOpen] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const viewTracked = useRef(false);

  // Access levels: free = preview only, basic = full content, pro = full + AI guide
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
      document.title = `${title} | IndieRadar JP`;
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
      });
      const data = await res.json();
      if (res.ok) setPrompt(data.prompt);
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
  const summaryContent =
    locale === 'ja'
      ? (article.ja_summary || article.en_summary || '')
      : locale === 'es'
      ? (article.es_summary || article.en_summary || '')
      : (article.en_summary || '');

  const insightContent =
    locale === 'ja'
      ? (article.ja_insight || article.en_insight || '')
      : locale === 'es'
      ? (article.es_insight || article.en_insight || '')
      : (article.en_insight || '');

  const sections = parseSections(summaryContent);

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
            {article.ja_difficulty}
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
        {sections.map((section, i) => {
          // Free users: show first section only, blur the rest
          const isGated = !canReadFull && i > 0;
          if (isGated) return null;
          return (
            <div key={i}>
              {section.heading && (
                <div className="flex items-center gap-2 mb-2">
                  <SectionIcon type={section.type} />
                  <h2 className="text-lg font-bold text-[var(--paper-3)]" style={{ fontFamily: 'var(--font-display)' }}>
                    {section.heading}
                  </h2>
                </div>
              )}
              <div className="text-[var(--paper-1)] leading-relaxed text-[15px] whitespace-pre-line pl-0 sm:pl-7">
                {section.body}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Paywall Gate (Free users) ────────────────────────── */}
      {!canReadFull && sections.length > 1 && (
        <div className="relative mb-8">
          {/* Blurred preview hint */}
          <div className="relative overflow-hidden rounded-2xl" style={{ maxHeight: '120px' }}>
            <div className="text-[var(--paper-1)] leading-relaxed text-[15px] whitespace-pre-line opacity-40" style={{ filter: 'blur(4px)', userSelect: 'none' }}>
              {sections.slice(1, 3).map(s => s.body).join('\n\n').slice(0, 300)}
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

      {/* ── "Start with this idea" button (Pro only) ──────── */}
      {canUseGuide && (
        <div className="mb-6">
          <button
            onClick={() => setBusinessPlanOpen(true)}
            className="w-full rounded-2xl border border-[var(--signal-gold)]/30 bg-[rgba(212,162,74,0.06)] p-5 text-center hover:bg-[rgba(212,162,74,0.12)] transition-all group"
          >
            <div className="flex items-center justify-center gap-2 text-[var(--signal-gold)] font-bold text-sm">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              {t.plan.button}
            </div>
          </button>
        </div>
      )}

      {/* ── Comments Section ─────────────────────────────────── */}
      <CommentsSection articleId={article.id} />

      {/* ── Business Plan Modal ──────────────────────────────── */}
      <BusinessPlanModal
        articleId={article.id}
        articleTitle={displayTitle}
        isOpen={businessPlanOpen}
        onClose={() => setBusinessPlanOpen(false)}
      />

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
