'use client';

import { useEffect, useState } from 'react';
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
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_difficulty: string;
  mrr_mentioned: number | null;
  upvotes: number;
  is_premium: boolean;
  author_id: string | null;
  ad_revenue_usd: number;
  created_at: string;
}

interface Profile {
  display_name: string | null;
  subscription_plan: string;
}

const sourceConfig: Record<string, { name: string; color: string; bg: string }> = {
  hackernews: { name: 'Hacker News', color: 'text-orange-400', bg: 'bg-transparent border-orange-400/30' },
  producthunt: { name: 'Product Hunt', color: 'text-red-400', bg: 'bg-transparent border-red-400/30' },
  reddit: { name: 'Reddit', color: 'text-blue-400', bg: 'bg-transparent border-blue-400/30' },
  x: { name: 'X', color: 'text-[var(--ink-5)]', bg: 'bg-transparent border-[var(--ink-2)]' },
};

export default function ArticleDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (user) {
        supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setUserPlan(data.subscription_plan || 'free');
          });
      }
    });
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('id', params.id)
        .single();
      setArticle(data);

      if (data?.author_id) {
        const { data: author } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', data.author_id)
          .single();
        setAuthorName((author as Profile | null)?.display_name || null);
      }
      setLoading(false);
    }
    if (params.id) load();
  }, [params.id]);

  const handleGeneratePrompt = async () => {
    if (!userId || !article) return;
    setPromptLoading(true);
    const res = await fetch('/api/generate-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: article.id, user_id: userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setPrompt(data.prompt);
    } else {
      alert(data.error);
    }
    setPromptLoading(false);
  };

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
          <div className="mx-auto w-14 h-14 bg-[var(--ink-1)] rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-[var(--ink-5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-[var(--ink-5)] text-lg mb-3">{t.articles.empty}</p>
          <Link href="/articles" className="text-[var(--signal-gold)] font-medium hover:text-[var(--signal-gold)]/80">
            {t.common.back_to_articles}
          </Link>
        </div>
      </div>
    );
  }

  const userSrc = { name: t.articles.user_post, color: 'text-purple-400', bg: 'bg-transparent border-purple-400/30' };
  const src = article.source === 'user' ? userSrc : (sourceConfig[article.source] || { name: article.source, color: 'text-[var(--ink-5)]', bg: 'bg-transparent border-[var(--ink-2)]' });

  const sourceUrl = article.source_url || article.original_url;
  const sourceDomain = (() => {
    try { return new URL(sourceUrl).hostname; } catch { return sourceUrl; }
  })();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 animate-fade-in">
      {/* Source attribution */}
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

      {/* Tags */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${src.bg} ${src.color}`}>
          {src.name}
        </span>
        {article.ja_difficulty && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            article.ja_difficulty === '初級' ? 'bg-transparent border-emerald-400/30 text-emerald-400'
            : article.ja_difficulty === '中級' ? 'bg-transparent border-amber-400/30 text-amber-400'
            : 'bg-transparent border-red-400/30 text-red-400'
          }`}>
            {article.ja_difficulty}
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

      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--paper-3)] mb-5 leading-snug">{article.ja_title}</h1>

      {/* Summary with free preview gating */}
      {(() => {
        const canReadFull = userPlan === 'basic' || userPlan === 'pro';
        const summary = article.ja_summary || '';
        const FREE_PREVIEW = 300;

        if (canReadFull || summary.length <= FREE_PREVIEW) {
          return (
            <div className="text-[var(--paper-1)] leading-relaxed mb-6 text-base whitespace-pre-line">
              {summary}
            </div>
          );
        }

        return (
          <div className="relative mb-6">
            <div className="text-[var(--paper-1)] leading-relaxed text-base whitespace-pre-line">
              {summary.slice(0, FREE_PREVIEW)}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--ink-0)] to-transparent" />
            <div className="relative mt-2 pt-6 text-center border-t border-[var(--ink-2)]">
              <div className="mx-auto w-10 h-10 bg-[rgba(212,162,74,0.1)] rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-[var(--signal-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="text-sm text-[var(--paper-3)] font-medium mb-1">{t.detail.paywall_title}</p>
              <p className="text-xs text-[var(--ink-5)] mb-4">{t.detail.paywall_desc}</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--signal-gold)] px-6 py-2.5 text-[var(--ink-0)] text-sm font-medium hover:opacity-90 transition-all shadow-sm hover:shadow-md"
              >
                {t.detail.paywall_button}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Insight */}
      {article.ja_insight && (
        <div className="bg-gradient-to-r from-[rgba(212,162,74,0.08)] to-transparent rounded-2xl p-5 mb-6 border border-[rgba(212,162,74,0.2)]">
          <p className="text-sm font-bold text-[var(--signal-gold)] mb-1.5 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            {t.detail.insight_heading}
          </p>
          <p className="text-sm text-[var(--paper-1)] leading-relaxed">{article.ja_insight}</p>
        </div>
      )}

      {/* Author */}
      {article.source_type === 'user' && authorName && (
        <div className="bg-[var(--ink-1)] rounded-2xl p-4 mb-6 text-sm border border-[var(--ink-2)]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
            <span className="font-medium text-[var(--paper-3)]">{t.detail.author_label} {authorName}</span>
          </div>
          <p className="text-[var(--ink-5)] text-xs mt-1.5 ml-6">{t.detail.author_revenue_note}</p>
        </div>
      )}

      {/* AI Prompt */}
      <div className="border border-[var(--ink-2)] rounded-2xl p-6 mb-6 bg-[var(--ink-1)]">
        <h2 className="text-lg font-bold text-[var(--paper-3)] mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--signal-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          {t.detail.prompt_heading}
        </h2>
        {userPlan !== 'pro' || !userId ? (
          <div>
            <p className="text-sm text-[var(--ink-5)] mb-4">{t.detail.prompt_free_desc}</p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink-2)] px-6 py-2.5 text-[var(--ink-5)] text-sm font-medium hover:bg-[var(--ink-2)]/80 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              {t.detail.prompt_free_button}
            </Link>
          </div>
        ) : prompt ? (
          <div className="bg-[var(--ink-0)] rounded-xl p-5 text-sm text-[var(--paper-1)] whitespace-pre-wrap leading-relaxed border border-[var(--ink-2)]">
            {prompt}
          </div>
        ) : (
          <button
            onClick={handleGeneratePrompt} disabled={promptLoading}
            className="rounded-xl bg-[var(--signal-gold)] px-6 py-3 text-[var(--ink-0)] text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-sm hover:shadow-md flex items-center gap-2"
          >
            {promptLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.detail.prompt_generating}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {t.detail.prompt_pro_button}
              </>
            )}
          </button>
        )}
      </div>

      {/* Bottom nav */}
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
