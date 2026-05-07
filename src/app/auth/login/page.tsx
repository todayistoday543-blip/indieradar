'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';

export default function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      setError(t.auth.error_oauth_failed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLoginError = (msg: string): string => {
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) return t.auth.error_invalid_credentials;
    if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) return t.auth.error_email_not_confirmed;
    if (msg.includes('Too many requests') || msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) return t.auth.error_rate_limit;
    return t.auth.error_generic;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(getLoginError(error.message));
      setLoading(false);
    } else {
      window.location.href = '/articles';
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[var(--signal-gold)] to-[var(--signal-gold)]/80 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-[var(--signal-gold)]/10">
            <svg className="w-6 h-6 text-[var(--ink-0)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-1">{t.auth.login_title}</h1>
          <p className="text-[var(--ink-5)] text-sm">{t.auth.login_subtitle}</p>
        </div>

        <div className="bg-[var(--ink-1)] rounded-2xl border border-[var(--ink-2)] p-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full rounded-xl border border-[var(--ink-2)] px-4 py-3 text-[var(--paper-3)] font-medium hover:bg-[var(--ink-2)] hover:border-[var(--ink-5)]/30 transition flex items-center justify-center gap-2.5 mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t.auth.google_login}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-[var(--ink-2)]" />
            <span className="text-xs text-[var(--ink-5)] font-medium">{t.auth.or_email}</span>
            <div className="flex-1 border-t border-[var(--ink-2)]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--paper-1)] mb-1.5">{t.auth.email_label}</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-xl border border-[var(--ink-2)] bg-[var(--ink-0)] px-4 py-2.5 text-sm text-[var(--paper-3)] outline-none transition focus:border-[var(--signal-gold)]/50" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--paper-1)] mb-1.5">{t.auth.password_label}</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full rounded-xl border border-[var(--ink-2)] bg-[var(--ink-0)] px-4 py-2.5 text-sm text-[var(--paper-3)] outline-none transition focus:border-[var(--signal-gold)]/50" />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl p-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-[var(--signal-gold)] px-4 py-3 text-[var(--ink-0)] font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-sm hover:shadow-md">
              {loading ? t.auth.logging_in : t.auth.login_button}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--ink-5)] mt-6">
          {t.auth.no_account}{' '}
          <Link href="/auth/signup" className="text-[var(--signal-gold)] font-medium hover:opacity-80">{t.common.signup}</Link>
        </p>
      </div>
    </div>
  );
}
