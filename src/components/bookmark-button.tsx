'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/components/user-context';
import { useI18n } from '@/i18n/context';

export function BookmarkButton({ articleId }: { articleId: string }) {
  const { userId } = useUser();
  const { t } = useI18n();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check bookmark status on mount
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/bookmarks?user_id=${userId}&article_id=${articleId}`)
      .then((r) => r.json())
      .then((d) => setBookmarked(d.bookmarked))
      .catch(() => {});
  }, [userId, articleId]);

  const handleToggle = useCallback(async () => {
    if (!userId || loading) return;

    // Optimistic update
    const prev = bookmarked;
    setBookmarked(!prev);
    setLoading(true);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, article_id: articleId }),
      });
      if (!res.ok) {
        // Revert on server error
        setBookmarked(prev);
      } else {
        const data = await res.json();
        setBookmarked(data.action === 'added');
      }
    } catch {
      // Revert on network error
      setBookmarked(prev);
    } finally {
      setLoading(false);
    }
  }, [userId, articleId, loading, bookmarked]);

  const tooltipText = !userId
    ? (t.bookmarks.login_to_bookmark)
    : bookmarked
      ? (t.bookmarks.remove)
      : (t.bookmarks.saved);

  return (
    <button
      onClick={handleToggle}
      disabled={!userId || loading}
      title={tooltipText}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all ${
        bookmarked
          ? 'border-[var(--signal-gold)] text-[var(--signal-gold)] bg-[rgba(212,162,74,0.1)]'
          : 'border-[var(--ink-3)] text-[var(--ink-5)] hover:border-[var(--ink-4)] hover:text-[var(--paper-2)]'
      } ${!userId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
        />
      </svg>
    </button>
  );
}
