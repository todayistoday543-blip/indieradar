'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { locales, localeNames, type Locale } from '@/i18n/config';

const localeFlags: Record<Locale, string> = {
  ja: '🇯🇵',
  en: '🇺🇸',
  zh: '🇨🇳',
  ko: '🇰🇷',
  hi: '🇮🇳',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇧🇷',
};

// These locales get AI translation; others show Chrome translate suggestion
const AI_SUPPORTED: Set<Locale> = new Set(['ja', 'en']);

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
        className="flex items-center gap-1.5 border border-[var(--ink-2)] bg-[var(--ink-1)] px-2.5 py-1.5 text-xs font-medium text-[var(--paper-3)] hover:bg-[var(--ink-2)] hover:border-[var(--ink-3)] transition-all"
        aria-label="Language"
        aria-expanded={open}
      >
        <span className="text-sm leading-none">{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <svg
          className={`w-3 h-3 text-[var(--ink-5)] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-52 border border-[var(--ink-2)] bg-[var(--ink-1)] py-1.5 z-50 animate-fade-in">
          {/* Primary: JP + EN with AI translation */}
          {locales.filter(l => AI_SUPPORTED.has(l)).map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                l === locale
                  ? 'bg-[var(--ink-2)] text-[var(--signal-gold)] font-medium'
                  : 'text-[var(--paper-1)] hover:bg-[var(--ink-2)]'
              }`}
            >
              <span className="text-base leading-none">{localeFlags[l]}</span>
              <span>{localeNames[l]}</span>
              {l === locale && (
                <svg className="w-4 h-4 text-[var(--signal-gold)] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}

          {/* Divider with Chrome translate note */}
          <div className="border-t border-[var(--ink-2)] mx-3 my-1.5" />
          <div className="px-3.5 py-1 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-[var(--ink-4)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
            </svg>
            <span className="text-[10px] text-[var(--ink-4)] leading-tight">Chrome translate for others</span>
          </div>

          {/* Other locales — UI only, article content via Chrome */}
          {locales.filter(l => !AI_SUPPORTED.has(l)).map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                l === locale
                  ? 'bg-[var(--ink-2)] text-[var(--signal-gold)] font-medium'
                  : 'text-[var(--paper-1)] hover:bg-[var(--ink-2)]'
              }`}
            >
              <span className="text-base leading-none">{localeFlags[l]}</span>
              <span>{localeNames[l]}</span>
              {l === locale && (
                <svg className="w-4 h-4 text-[var(--signal-gold)] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
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
