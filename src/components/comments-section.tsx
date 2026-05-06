'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/components/user-context';
import { useI18n } from '@/i18n/context';
import { timeAgo } from '@/lib/time-ago';

interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
}

export function CommentsSection({ articleId }: { articleId: string }) {
  const { userId } = useUser();
  const { t, locale } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?article_id=${articleId}`);
      const data = await res.json();
      if (res.ok) setComments(data.comments || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !body.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          user_id: userId,
          display_name: displayName.trim() || 'Anonymous',
          body: body.trim(),
        }),
      });

      if (res.ok) {
        setBody('');
        fetchComments();
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || t.common.error_load);
      }
    } catch {
      setSubmitError(t.common.error_network);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!userId) return;
    const confirmed = window.confirm(t.comments.delete_confirm);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/comments?id=${commentId}&user_id=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="border border-[var(--ink-2)] rounded-2xl p-6 mb-6 bg-[var(--ink-1)]">
      <h2
        className="text-lg font-bold text-[var(--paper-3)] mb-4 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <svg className="w-5 h-5 text-[var(--signal-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        {t.comments.heading}
        {comments.length > 0 && (
          <span className="text-sm font-normal text-[var(--ink-5)]" style={{ fontFamily: 'var(--font-mono)' }}>
            ({comments.length})
          </span>
        )}
      </h2>

      {/* Comment form */}
      {userId ? (
        <form onSubmit={handleSubmit} className="mb-5">
          <div className="mb-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t.comments.display_name_placeholder}
              maxLength={50}
              className="w-full sm:w-48 bg-[var(--ink-0)] border border-[var(--ink-3)] rounded-lg px-3 py-1.5 text-sm text-[var(--paper-2)] placeholder-[var(--ink-5)] focus:outline-none focus:border-[var(--signal-gold)] transition-colors mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.comments.placeholder}
            maxLength={2000}
            rows={3}
            className="w-full bg-[var(--ink-0)] border border-[var(--ink-3)] rounded-lg px-3 py-2.5 text-sm text-[var(--paper-2)] placeholder-[var(--ink-5)] focus:outline-none focus:border-[var(--signal-gold)] transition-colors resize-y"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[var(--ink-5)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {body.length}/2000
            </span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="rounded-lg bg-[var(--signal-gold)] text-[var(--ink-0)] px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {submitting ? '...' : (t.comments.submit)}
            </button>
          </div>
          {submitError && (
            <p className="mt-2 text-xs text-[var(--signal-warn)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {submitError}
            </p>
          )}
        </form>
      ) : (
        <div className="mb-5 px-4 py-3 border border-[var(--ink-2)] rounded-lg bg-[var(--ink-0)] text-center">
          <p className="text-sm text-[var(--ink-5)]">
            {t.comments.login_to_comment}
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-16 w-full rounded-lg" />
          <div className="skeleton h-16 w-full rounded-lg" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--ink-5)] text-center py-4">
          {t.comments.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-[var(--ink-0)] border border-[var(--ink-2)] rounded-lg px-4 py-3 group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Avatar circle */}
                  <div className="w-6 h-6 rounded-full bg-[var(--ink-3)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[var(--paper-2)] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
                      {(comment.display_name || 'A')[0]}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--paper-2)] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                    {comment.display_name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-[var(--ink-5)] flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                    {timeAgo(comment.created_at, locale)}
                  </span>
                </div>

                {/* Delete button - only for own comments */}
                {userId === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--ink-2)] transition-all text-[var(--ink-5)] hover:text-[var(--signal-warn)]"
                    title={t.comments.delete_confirm}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--paper-1)] leading-relaxed whitespace-pre-wrap break-words">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
