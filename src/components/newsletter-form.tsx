'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/context';

export function NewsletterForm() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error_duplicate' | 'error_invalid' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), locale }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const data = await res.json();
        if (data.error === 'duplicate') {
          setStatus('error_duplicate');
        } else if (data.error === 'invalid_email') {
          setStatus('error_invalid');
        } else {
          setStatus('error');
        }
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--signal-live)]">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{t.newsletter.subscribed}</span>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'idle' && status !== 'loading') setStatus('idle');
          }}
          placeholder={t.newsletter.placeholder}
          required
          className="flex-1 min-w-0 bg-[var(--ink-0)] border border-[var(--ink-2)] px-3 py-2 text-[12px] text-[var(--paper-2)] placeholder-[var(--ink-4)] focus:border-[var(--signal-gold)] focus:outline-none transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="shrink-0 bg-[var(--signal-gold)] text-[var(--ink-0)] px-4 py-2 text-[11px] uppercase tracking-wider font-medium hover:opacity-90 transition-all disabled:opacity-50"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          {status === 'loading' ? '...' : t.newsletter.subscribe}
        </button>
      </form>
      {status === 'error_duplicate' && (
        <p className="text-[11px] text-[var(--signal-warn)] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
          {t.newsletter.error_duplicate}
        </p>
      )}
      {status === 'error_invalid' && (
        <p className="text-[11px] text-[var(--signal-warn)] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
          {t.newsletter.error_invalid}
        </p>
      )}
      {status === 'error' && (
        <p className="text-[11px] text-[var(--signal-warn)] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
          {t.common.error_load}
        </p>
      )}
    </div>
  );
}
