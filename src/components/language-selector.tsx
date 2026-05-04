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
        <div className="absolute right-0 mt-1.5 w-44 border border-[var(--ink-2)] bg-[var(--ink-1)] py-1.5 z-50 animate-fade-in">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
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
