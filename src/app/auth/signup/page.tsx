'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';

export default function SignupPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      setError(t.auth.error_oauth_failed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    return score;
  })();

  const strengthColor = ['bg-[var(--ink-2)]', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

  const getSignupError = (msg: string): string => {
    if (msg.includes('User already registered') || msg.includes('user_already_exists')) return t.auth.error_user_already_registered;
    if (msg.includes('Password should be at least') || msg.includes('weak_password')) return t.auth.error_generic;
    if (msg.includes('Too many requests') || msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) return t.auth.error_rate_limit;
    return t.auth.error_generic;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });

    if (error) {
      setError(getSignupError(error.message));
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="mx-auto w-16 h-16 bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-3">{t.auth.confirm_email_title}</h1>
          <p className="text-[var(--ink-5)] leading-relaxed">
            {email} {t.auth.confirm_email_desc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[var(--signal-gold)] to-[var(--signal-gold)]/80 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-[var(--signal-gold)]/10">
            <svg className="w-6 h-6 text-[var(--ink-0)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-1">{t.auth.signup_title}</h1>
          <p className="text-[var(--ink-5)] text-sm">{t.auth.signup_subtitle}</p>
        </div>

        <div className="bg-[var(--ink-1)] rounded-2xl border border-[var(--ink-2)] p-6">
          <button
            onClick={handleGoogleSignup}
            className="w-full rounded-xl border border-[var(--ink-2)] px-4 py-3 text-[var(--paper-3)] font-medium hover:bg-[var(--ink-2)] hover:border-[var(--ink-5)]/30 transition flex items-center justify-center gap-2.5 mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t.auth.google_signup}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-[var(--ink-2)]" />
            <span className="text-xs text-[var(--ink-5)] font-medium">{t.auth.or_email}</span>
            <div className="flex-1 border-t border-[var(--ink-2)]" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--paper-1)] mb-1.5">{t.auth.email_label}</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-xl border border-[var(--ink-2)] bg-[var(--ink-0)] px-4 py-2.5 text-sm text-[var(--paper-3)] outline-none transition focus:border-[var(--signal-gold)]/50" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--paper-1)] mb-1.5">
                {t.auth.password_label}{t.auth.password_hint}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[var(--ink-2)] bg-[var(--ink-0)] px-4 py-2.5 pr-10 text-sm text-[var(--paper-3)] outline-none transition focus:border-[var(--signal-gold)]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-5)] hover:text-[var(--paper-1)] transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength ? strengthColor[passwordStrength] : 'bg-[var(--ink-2)]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl p-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-[var(--signal-gold)] px-4 py-3 text-[var(--ink-0)] font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-sm hover:shadow-md">
              {loading ? t.auth.signing_up : t.auth.signup_button}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--ink-5)] mt-6">
          {t.auth.has_account}{' '}
          <Link href="/auth/login" className="text-[var(--signal-gold)] font-medium hover:opacity-80">{t.common.login}</Link>
        </p>
      </div>
    </div>
  );
}
