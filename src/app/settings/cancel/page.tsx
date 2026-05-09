'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import { useUser } from '@/components/user-context';
import Link from 'next/link';

export default function CancelPage() {
  const { t } = useI18n();
  const { userId, plan, loading } = useUser();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    if (!userId) return;
    setRedirecting(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to open billing portal');
        setRedirecting(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-12 w-full mb-4" />
        <div className="skeleton h-12 w-full" />
      </div>
    );
  }

  /* Not logged in */
  if (!userId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="mx-auto w-14 h-14 bg-[var(--ink-1)] border border-[var(--ink-2)] flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-[var(--ink-5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-2">{t.settings.cancel_heading}</h1>
          <p className="text-[var(--ink-5)] mb-6">{t.settings.login_required}</p>
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

  /* Free plan — nothing to cancel */
  if (plan === 'free') {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 animate-fade-in">
        <h1
          className="text-2xl font-bold text-[var(--paper-3)] mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t.settings.cancel_heading}
        </h1>

        <div className="bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-lg p-6 mb-8">
          <p className="text-[var(--paper-2)] text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
            {t.settings.cancel_free_msg}
          </p>
        </div>

        <Link
          href="/settings"
          className="text-sm text-[var(--signal-gold)] hover:opacity-80 transition flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t.settings.cancel_back}
        </Link>
      </div>
    );
  }

  /* Paid plan — show cancel flow */
  return (
    <div className="mx-auto max-w-xl px-4 py-10 animate-fade-in">
      <h1
        className="text-2xl font-bold text-[var(--paper-3)] mb-6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t.settings.cancel_heading}
      </h1>

      <div className="bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-lg p-6 mb-8">
        <div className="flex items-start gap-3 mb-4">
          <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-[var(--paper-2)] text-sm leading-relaxed" style={{ fontFamily: 'var(--font-mono)' }}>
            {t.settings.cancel_desc}
          </p>
        </div>

        <div className="text-xs text-[var(--ink-5)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
          Current plan: <span className="text-[var(--signal-gold)] uppercase">{plan}</span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4 animate-fade-in">{error}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCancel}
          disabled={redirecting}
          className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {redirecting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Redirecting...
            </>
          ) : (
            t.settings.cancel_button
          )}
        </button>

        <Link
          href="/settings"
          className="rounded-lg border border-[var(--ink-2)] text-[var(--paper-2)] px-6 py-3 text-sm font-medium hover:bg-[var(--ink-2)] transition-all text-center"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {t.settings.cancel_back}
        </Link>
      </div>
    </div>
  );
}
