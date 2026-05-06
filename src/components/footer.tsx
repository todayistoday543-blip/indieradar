'use client';

import { useI18n } from '@/i18n/context';
import { localeNames } from '@/i18n/config';
import { NewsletterForm } from './newsletter-form';
import Link from 'next/link';

function ApertureLogo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 180 180"
      aria-hidden="true"
      style={{ color: 'var(--paper-3)' }}
    >
      <g transform="translate(90 90)">
        <circle r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeOpacity="0.6" />
        <circle r="22" fill="none" stroke="#D4A24A" strokeWidth="6" />
        <line x1="-6" y1="-22" x2="-6" y2="22" stroke="#D4A24A" strokeWidth="6" />
        <line x1="6" y1="-22" x2="6" y2="22" stroke="#D4A24A" strokeWidth="6" />
        <circle r="6" fill="#D4A24A" />
      </g>
    </svg>
  );
}

const productLinks = [
  { href: '/articles', labelKey: 'signals' as const },
  { href: '/submit', labelKey: 'submit' as const },
  { href: '/pricing', labelKey: 'pricing' as const },
];

// Derived from config so it stays in sync with the actual supported locales
const languages = Object.values(localeNames);

const companyLinks = [
  { href: '/submit', label: 'Submit a case' },
  { href: '/pricing', label: 'Pricing' },
];

export function Footer() {
  const { t } = useI18n();

  const productLabelMap: Record<string, string> = {
    signals: t.common.articles,
    submit: t.common.submit,
    pricing: t.common.pricing,
  };

  return (
    <>
      {/* Main footer */}
      <footer className="mt-auto px-[40px] pt-[40px] pb-[32px]">
        <div className="grid grid-cols-[1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-[32px] md:gap-[40px]">
          {/* Column 1 — Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-[10px] mb-[16px]">
              <ApertureLogo />
              <span
                className="text-paper-3 tracking-[-0.02em]"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              >
                IndieRadar
              </span>
            </div>
            <p className="text-[12px] leading-[1.7] text-paper-1 max-w-[280px] mb-[16px]">
              {t.footer.sources}
            </p>
            <div className="max-w-[280px]">
              <NewsletterForm />
            </div>
          </div>

          {/* Column 2 — Product */}
          <div>
            <h4
              className="text-ink-5 uppercase mb-[16px]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.2em',
              }}
            >
              PRODUCT
            </h4>
            <ul className="list-none p-0 m-0">
              {productLinks.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    href={link.href}
                    className="text-[12px] leading-[2] text-paper-2 no-underline transition-colors duration-[var(--dur-fast)] hover:text-paper-3"
                  >
                    {productLabelMap[link.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Languages */}
          <div>
            <h4
              className="text-ink-5 uppercase mb-[16px]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.2em',
              }}
            >
              LANGUAGES
            </h4>
            <ul className="list-none p-0 m-0">
              {languages.map((lang) => (
                <li key={lang}>
                  <span className="text-[12px] leading-[2] text-paper-2">
                    {lang}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Company */}
          <div>
            <h4
              className="text-ink-5 uppercase mb-[16px]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.2em',
              }}
            >
              COMPANY
            </h4>
            <ul className="list-none p-0 m-0">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[12px] leading-[2] text-paper-2 no-underline transition-colors duration-[var(--dur-fast)] hover:text-paper-3"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>

      {/* Status bar */}
      <div
        className="border-t border-ink-2 px-[40px] py-[16px] flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-[8px]"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.18em',
        }}
      >
        <span className="text-ink-4">
          &copy; 2026 INDIERADAR &middot; DISCOVERY ENGINE V0.4
        </span>
        <span className="text-ink-4 flex items-center gap-[6px]">
          <span
            className="inline-block w-[6px] h-[6px] rounded-full bg-signal-live"
            style={{ boxShadow: '0 0 8px var(--signal-live)' }}
          />
          ALL SYSTEMS NOMINAL
        </span>
      </div>
    </>
  );
}
