'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/user-context';
import { useI18n } from '@/i18n/context';
import { ArticleCard } from '@/components/article-card';
import Link from 'next/link';

interface BookmarkEntry {
  id: string;
  article_id: string;
  created_at: string;
  articles: {
    id: string;
    source: string;
    original_title: string;
    en_title?: string;
    en_summary?: string;
    en_insight?: string;
    ja_title?: string;
    ja_summary?: string;
    ja_insight?: string;
    es_title?: string;
    es_summary?: string;
    es_insight?: string;
    ja_difficulty: string;
    business_model: string | null;
    mrr_mentioned: number | null;
    upvotes: number;
    is_premium: boolean;
    original_url: string;
    created_at: string;
  };
}

export default function BookmarksPage() {
  const { userId, loading: userLoading } = useUser();
  const { t } = useI18n();
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/bookmarks?list=true&user_id=${userId}`);
        const data = await res.json();
        if (res.ok) setBookmarks(data.bookmarks || []);
      } catch { /* ignore */ }
      setLoading(false);
    }

    load();
  }, [userId, userLoading]);

  // Set page title
  useEffect(() => {
    document.title = `${t.bookmarks.heading} | IndieRadar JP`;
  }, [t]);

  if (userLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="skeleton h-10 w-48 mb-6 rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-16 w-full rounded-lg" />
          <div className="skeleton h-16 w-full rounded-lg" />
          <div className="skeleton h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 animate-fade-in">
        <div className="text-center">
          <svg className="w-12 h-12 text-[var(--ink-4)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          <h1 className="text-xl font-bold text-[var(--paper-3)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {t.bookmarks.heading}
          </h1>
          <p className="text-sm text-[var(--ink-5)] mb-5">
            {t.bookmarks.login_to_bookmark}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex rounded-xl bg-[var(--signal-gold)] text-[var(--ink-0)] px-6 py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            {t.common.login}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 animate-fade-in">
      <h1
        className="text-2xl sm:text-3xl font-bold text-[var(--paper-3)] mb-6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t.bookmarks.heading}
      </h1>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-[var(--ink-4)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          <p className="text-[var(--ink-5)]">
            {t.bookmarks.empty}
          </p>
          <Link
            href="/articles"
            className="inline-flex text-sm text-[var(--signal-gold)] font-medium hover:opacity-80 transition mt-3"
          >
            {t.common.back_to_articles} →
          </Link>
        </div>
      ) : (
        <div className="border border-[var(--ink-2)] rounded-2xl overflow-hidden divide-y divide-[var(--ink-2)]">
          {bookmarks.map((bm) => {
            if (!bm.articles) return null;
            return (
              <ArticleCard key={bm.id} article={bm.articles} />
            );
          })}
        </div>
      )}
    </div>
  );
}
