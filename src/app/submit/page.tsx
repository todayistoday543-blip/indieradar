'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';

export default function SubmitPage() {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, content, user_id: userId }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult({ success: true, message: data.message });
      setUrl('');
      setTitle('');
      setContent('');
    } else {
      setResult({ error: data.error });
    }
    setLoading(false);
  };

  if (!userId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="mx-auto w-14 h-14 bg-[var(--ink-1)] border border-[var(--ink-2)] flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-[var(--ink-5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-2">{t.submit.heading}</h1>
          <p className="text-[var(--ink-5)] mb-6">{t.submit.login_required}</p>
          <Link
            href="/auth/login"
            className="inline-block bg-[var(--signal-gold)] px-7 py-3 text-[var(--ink-0)] font-semibold hover:brightness-110 transition-all font-mono text-sm tracking-wide"
          >
            {t.common.login}
          </Link>
        </div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center animate-scale-in">
          <div className="mx-auto w-16 h-16 bg-[var(--ink-1)] border border-[var(--signal-live)] flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[var(--signal-live)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--paper-3)] mb-3">{t.submit.success_title}</h2>
          <p className="text-[var(--ink-5)] mb-3">{result.message}</p>
          <div className="inline-block mt-2 px-5 py-2.5 bg-[var(--ink-1)] border border-[var(--signal-gold)]/40 text-sm text-[var(--signal-gold)] font-medium font-mono">
            {t.submit.review_status}
          </div>
          <div className="mt-6">
            <button
              onClick={() => setResult(null)}
              className="text-[var(--signal-gold)] font-medium hover:brightness-110 transition font-mono text-sm"
            >
              {t.submit.submit_another}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-[var(--paper-3)] mb-2">{t.submit.heading}</h1>
        <p className="text-[var(--ink-5)]">{t.submit.subtitle}</p>
      </div>

      <div className="bg-[var(--ink-1)] border border-[var(--ink-2)] p-6 sm:p-8 animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-[var(--paper-2)] mb-1.5">
              {t.submit.url_label} <span className="text-red-500">*</span>
            </label>
            <input
              id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
              placeholder={t.submit.url_placeholder}
              className="w-full border border-[var(--ink-3)] bg-[var(--ink-0)] px-4 py-3 text-sm text-[var(--paper-3)] placeholder:text-[var(--ink-5)] outline-none transition focus:border-[var(--signal-gold)]"
            />
            <p className="mt-1.5 text-xs text-[var(--ink-5)]">{t.submit.url_hint}</p>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--paper-2)] mb-1.5">
              {t.submit.title_label}
            </label>
            <input
              id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t.submit.title_placeholder}
              className="w-full border border-[var(--ink-3)] bg-[var(--ink-0)] px-4 py-3 text-sm text-[var(--paper-3)] placeholder:text-[var(--ink-5)] outline-none transition focus:border-[var(--signal-gold)]"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-[var(--paper-2)] mb-1.5">
              {t.submit.content_label}
            </label>
            <textarea
              id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={4}
              placeholder={t.submit.content_placeholder}
              className="w-full border border-[var(--ink-3)] bg-[var(--ink-0)] px-4 py-3 text-sm text-[var(--paper-3)] placeholder:text-[var(--ink-5)] outline-none transition focus:border-[var(--signal-gold)] resize-none"
            />
          </div>

          {result?.error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 p-3">{result.error}</div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-[var(--signal-gold)] px-6 py-3.5 text-[var(--ink-0)] font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-mono text-sm tracking-wide"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.submit.submitting}
              </>
            ) : (
              t.submit.submit_button
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 p-5 bg-[var(--ink-1)] border border-[var(--ink-2)] text-sm text-[var(--paper-1)] animate-fade-in stagger-2">
        <p className="font-semibold text-[var(--paper-2)] mb-2">{t.submit.rules_title}</p>
        <ul className="space-y-1.5 list-none">
          <li className="flex items-start gap-2"><span className="text-[var(--signal-gold)] mt-0.5">&#x25B8;</span>{t.submit.rule_1}</li>
          <li className="flex items-start gap-2"><span className="text-[var(--signal-gold)] mt-0.5">&#x25B8;</span>{t.submit.rule_2}</li>
          <li className="flex items-start gap-2"><span className="text-[var(--signal-gold)] mt-0.5">&#x25B8;</span>{t.submit.rule_3}</li>
        </ul>
      </div>
    </div>
  );
}
