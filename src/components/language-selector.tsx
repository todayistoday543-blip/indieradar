'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { localeNames, type Locale } from '@/i18n/config';

const localeFlags: Record<Locale, string> = {
  ja: '🇯🇵',
  en: '🇺🇸',
  es: '🇲🇽',
};

// All 3 supported locales have AI-generated translations
const AI_LOCALES: Locale[] = ['ja', 'en', 'es'];

export function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-1.5
          border text-xs font-medium tracking-wide transition-all
          ${open
            ? 'border-[var(--signal-gold)] bg-[var(--ink-2)] text-[var(--signal-gold)]'
            : 'border-[var(--signal-gold)]/40 bg-[var(--ink-1)] text-[var(--paper-2)] hover:border-[var(--signal-gold)] hover:text-[var(--signal-gold)] hover:bg-[var(--ink-2)]'
          }
        `}
        aria-label="Select language"
        aria-expanded={open}
      >
        {/* Globe icon */}
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="text-sm leading-none">{localeFlags[locale]}</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{localeNames[locale]}</span>
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-48 border border-[var(--signal-gold)]/30 bg-[var(--ink-1)] py-1.5 z-50 animate-fade-in shadow-lg shadow-black/20">
          {/* Header */}
          <div className="px-3.5 py-1.5 mb-1 border-b border-[var(--ink-2)]">
            <span
              className="text-[10px] tracking-widest text-[var(--ink-5)] uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Language
            </span>
          </div>
          {AI_LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                l === locale
                  ? 'bg-[var(--ink-2)] text-[var(--signal-gold)] font-medium'
                  : 'text-[var(--paper-1)] hover:bg-[var(--ink-2)] hover:text-[var(--paper-3)]'
              }`}
            >
              <span className="text-base leading-none">{localeFlags[l]}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{localeNames[l]}</span>
              {l === locale && (
                <svg className="w-3.5 h-3.5 text-[var(--signal-gold)] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
