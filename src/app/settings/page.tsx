'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

/* ── Country list (ISO 3166-1) ─────────────────────────────── */

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'RO', name: 'Romania' },
  { code: 'HU', name: 'Hungary' },
  { code: 'GR', name: 'Greece' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'EG', name: 'Egypt' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Nepal' },
];

/** Guess country from browser language */
function guessCountryFromLang(): string {
  if (typeof navigator === 'undefined') return '';
  const lang = navigator.language || '';
  const region = lang.split('-')[1]?.toUpperCase();
  if (region && COUNTRIES.find((c) => c.code === region)) return region;
  // Fallback: language code → common country
  const langMap: Record<string, string> = {
    ja: 'JP', ko: 'KR', zh: 'CN', hi: 'IN', de: 'DE',
    fr: 'FR', es: 'ES', pt: 'BR', it: 'IT', nl: 'NL',
    sv: 'SE', no: 'NO', da: 'DK', fi: 'FI', pl: 'PL',
    tr: 'TR', ru: 'RU', ar: 'SA', th: 'TH', vi: 'VN',
    id: 'ID', ms: 'MY',
  };
  const code = lang.split('-')[0];
  return langMap[code] || '';
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [countryCode, setCountryCode] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user ?? null);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country_code')
          .eq('id', user.id)
          .single();

        if (profile?.country_code) {
          setCountryCode(profile.country_code);
        } else {
          // Guess from browser
          setCountryCode(guessCountryFromLang());
        }
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    const country = COUNTRIES.find((c) => c.code === countryCode);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        country_code: countryCode || null,
        country_name: country?.name || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="mx-auto w-14 h-14 bg-[var(--ink-1)] border border-[var(--ink-2)] flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-[var(--ink-5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-2">{t.settings.heading}</h1>
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

  return (
    <div className="mx-auto max-w-xl px-4 py-10 animate-fade-in">
      <h1
        className="text-2xl font-bold text-[var(--paper-3)] mb-8"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t.settings.heading}
      </h1>

      {/* Email (read-only) */}
      <div className="mb-6">
        <label className="block text-xs text-[var(--ink-5)] mb-1.5 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          {t.settings.email_label}
        </label>
        <div className="bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-lg px-4 py-3 text-sm text-[var(--ink-5)]">
          {user.email}
        </div>
      </div>

      {/* Country selector */}
      <div className="mb-8">
        <label className="block text-xs text-[var(--ink-5)] mb-1.5 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          {t.settings.country_label}
        </label>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-full bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-lg px-4 py-3 text-sm text-[var(--paper-2)] focus:border-[var(--signal-gold)] focus:outline-none transition-colors appearance-none cursor-pointer"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <option value="">{t.settings.country_placeholder}</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--ink-5)] mt-1.5">{t.settings.country_hint}</p>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[var(--signal-gold)] text-[var(--ink-0)] px-6 py-3 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {saving ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.settings.saving}
          </>
        ) : (
          t.settings.save_button
        )}
      </button>

      {saved && (
        <p className="text-sm text-emerald-400 mt-3 animate-fade-in">{t.settings.saved}</p>
      )}

      {/* Cancel subscription section */}
      <div className="mt-10 pt-6 border-t border-[var(--ink-2)]">
        <h2
          className="text-sm font-semibold text-[var(--paper-2)] mb-1 uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {t.settings.cancel_section}
        </h2>
        <p className="text-xs text-[var(--ink-5)] mb-3">{t.settings.cancel_section_desc}</p>
        <Link
          href="/settings/cancel"
          className="inline-block rounded-lg border border-red-500/40 text-red-400 px-5 py-2.5 text-sm font-medium hover:bg-red-500/10 transition-all"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {t.settings.cancel_section}
        </Link>
      </div>

      {/* Back link */}
      <div className="mt-10 pt-6 border-t border-[var(--ink-2)]">
        <Link
          href="/articles"
          className="text-sm text-[var(--signal-gold)] hover:opacity-80 transition flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t.common.back_to_articles}
        </Link>
      </div>
    </div>
  );
}
