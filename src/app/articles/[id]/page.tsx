'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';

interface Article {
  id: string;
  source: string;
  source_type: string;
  source_url: string;
  original_url: string;
  original_title: string;
  author_profile_url: string | null;
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_difficulty: string;
  business_model: string | null;
  mrr_mentioned: number | null;
  upvotes: number;
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
    case 'overview':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      );
    case 'business':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'journey':
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
    default:
      return null;
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
  let lastType = 'overview';
  const matches = [...summary.matchAll(sectionRegex)];

  if (matches.length === 0) {
    // Not structured — return as a single section
    return [{ heading: '', body: summary.trim(), type: 'overview' }];
  }

  for (const match of matches) {
    if (lastHeading) {
      const body = summary.slice(lastIndex, match.index).trim();
      if (body) parts.push({ heading: lastHeading, body, type: lastType });
    } else if (match.index && match.index > 0) {
      const preamble = summary.slice(0, match.index).trim();
      if (preamble) parts.push({ heading: '', body: preamble, type: 'overview' });
    }
    lastHeading = match[1].trim();
    lastType = guessType(lastHeading);
    lastIndex = (match.index ?? 0) + match[0].length;
  }

  // Last section
  const tail = summary.slice(lastIndex).trim();
  if (tail) parts.push({ heading: lastHeading, body: tail, type: lastType });

  return parts;
}

function guessType(heading: string): string {
  if (/概要|overview|summary/i.test(heading)) return 'overview';
  if (/事業|ビジネス|business|model|収益/i.test(heading)) return 'business';
  if (/経緯|journey|story|成功|timeline|歴史/i.test(heading)) return 'journey';
  if (/技術|tech|stack|ツール|tool/i.test(heading)) return 'tech';
  return 'overview';
}

/* ── Component ─────────────────────────────────────────────── */

export default function ArticleDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  // Fetch auth + profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('country_code, country_name')
          .eq('id', user.id)
          .single();
        if (profile) setUserProfile(profile);
      }
    });
  }, []);

  // Fetch article
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('id', params.id)
        .single();
      setArticle(data);
      setLoading(false);
    }
    if (params.id) load();
  }, [params.id]);

  const handleGenerateGuide = useCallback(async () => {
    if (!userId || !article) return;
    setPromptLoading(true);
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: article.id,
          user_id: userId,
          country_name: userProfile?.country_name || null,
          country_code: userProfile?.country_code || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPrompt(data.prompt);
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error generating guide');
    }
    setPromptLoading(false);
  }, [userId, article, userProfile]);

  /* ── Loading skeleton ────────────────────────────────────── */
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

  /* ── Not found ───────────────────────────────────────────── */
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

  // Parse structured content sections
  const sections = parseSections(article.ja_summary || '');

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

      {/* ── Tags ─────────────────────────────────────────────── */}
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
            ${article.mrr_mentioned.toLocaleString()}/mo
          </span>
        )}
        <span className="text-xs text-[var(--ink-5)] ml-auto flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          {article.upvotes}
        </span>
      </div>

      {/* ── Title ────────────────────────────────────────────── */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--paper-3)] mb-6 leading-snug">
        {article.ja_title}
      </h1>

      {/* ── Structured Content Sections ──────────────────────── */}
      <div className="space-y-6 mb-8">
        {sections.map((section, i) => (
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
        ))}
      </div>

      {/* ── Author profile link ──────────────────────────────── */}
      {article.author_profile_url && (
        <div className="bg-[var(--ink-1)] rounded-xl p-3 mb-6 text-sm border border-[var(--ink-2)] flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--ink-5)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
          <a
            href={article.author_profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--signal-gold)] hover:opacity-80 transition truncate"
          >
            {t.detail.author_label} →
          </a>
        </div>
      )}

      {/* ── Global Insight ───────────────────────────────────── */}
      {article.ja_insight && (
        <div className="bg-gradient-to-r from-[rgba(212,162,74,0.08)] to-transparent rounded-2xl p-5 mb-6 border border-[rgba(212,162,74,0.2)]">
          <p className="text-sm font-bold text-[var(--signal-gold)] mb-1.5 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            {t.detail.insight_heading}
          </p>
          <p className="text-sm text-[var(--paper-1)] leading-relaxed">{article.ja_insight}</p>
        </div>
      )}

      {/* ── Country-specific context ─────────────────────────── */}
      {userProfile?.country_name && (
        <div className="bg-gradient-to-r from-[rgba(99,102,241,0.08)] to-transparent rounded-2xl p-5 mb-6 border border-[rgba(99,102,241,0.2)]">
          <p className="text-sm font-bold text-indigo-400 mb-1.5 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {t.detail.country_context_heading}
          </p>
          <p className="text-sm text-[var(--paper-1)] leading-relaxed">
            {t.detail.country_context_desc}
          </p>
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
          <div>
            <p className="text-sm text-[var(--ink-5)] mb-4">{t.detail.guide_login_desc}</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--signal-gold)] px-6 py-2.5 text-[var(--ink-0)] text-sm font-medium hover:opacity-90 transition"
            >
              {t.detail.guide_login_button}
            </Link>
          </div>
        ) : prompt ? (
          <div className="bg-[var(--ink-0)] rounded-xl p-5 text-sm text-[var(--paper-1)] whitespace-pre-wrap leading-relaxed border border-[var(--ink-2)] max-h-[600px] overflow-y-auto">
            {prompt}
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--ink-5)] mb-4">{t.detail.guide_desc}</p>
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

      {/* ── Bottom nav ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-5 border-t border-[var(--ink-2)]">
        <span className="text-xs text-[var(--ink-5)]">
          {new Date(article.created_at).toLocaleDateString('ja-JP')}
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
