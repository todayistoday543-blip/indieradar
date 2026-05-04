'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/context';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <div className="text-8xl font-extrabold text-[var(--signal-gold)] mb-4">404</div>
        <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-3">
          {t.common.not_found}
        </h1>
        <p className="text-[var(--ink-5)] mb-8 max-w-md mx-auto">
          {t.common.not_found_desc}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--signal-gold)] px-7 py-3 text-[var(--ink-0)] font-medium hover:opacity-90 transition-all shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t.common.back_home}
        </Link>
      </div>
    </div>
  );
}
