'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/context';

/* ------------------------------------------------------------------ */
/*  Radar SVG — concentric circles in gold, top-right decoration       */
/* ------------------------------------------------------------------ */
function RadarSVG() {
  return (
    <svg
      className="absolute -top-16 -right-16 w-[420px] h-[420px] pointer-events-none select-none"
      viewBox="0 0 420 420"
      aria-hidden="true"
    >
      <circle cx="210" cy="210" r="60" fill="none" stroke="var(--signal-gold)" strokeWidth="1" opacity="0.15" />
      <circle cx="210" cy="210" r="110" fill="none" stroke="var(--signal-gold)" strokeWidth="1" opacity="0.12" />
      <circle cx="210" cy="210" r="160" fill="none" stroke="var(--signal-gold)" strokeWidth="1" opacity="0.08" />
      <circle cx="210" cy="210" r="210" fill="none" stroke="var(--signal-gold)" strokeWidth="1" opacity="0.05" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Digest Panel — weekly signal digest with 2x2 grid                  */
/* ------------------------------------------------------------------ */
function DigestPanel() {
  return (
    <div className="self-end border border-[var(--ink-2)] bg-[rgba(20,20,22,0.4)] backdrop-blur-[8px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ink-2)]">
        <span
          className="text-[10px] tracking-[0.18em] text-[var(--ink-5)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          WEEKLY SIGNAL DIGEST
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-[6px] w-[6px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--signal-live)] opacity-75" />
            <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[var(--signal-live)]" />
          </span>
          <span
            className="text-[10px] tracking-[0.18em] text-[var(--signal-live)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ACTIVE
          </span>
        </span>
      </div>

      {/* 2x2 cells */}
      <div className="grid grid-cols-2">
        <DigestCell label="SCANNED" value="2,847" />
        <DigestCell label="CLEARED" value="312" borderLeft />
        <DigestCell label="MRR_TOTAL" value="$1.2M" borderTop gold />
        <DigestCell label="LANGS" value="9" borderTop borderLeft />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--ink-2)]">
        <span
          className="text-[10px] tracking-[0.18em] text-[var(--ink-5)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          NEXT_SWEEP — 03:48
        </span>
        <Link
          href="/articles"
          className="text-[10px] tracking-[0.18em] text-[var(--signal-gold)] hover:brightness-125 transition-all"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          SUBSCRIBE &rarr;
        </Link>
      </div>
    </div>
  );
}

function DigestCell({
  label,
  value,
  borderLeft,
  borderTop,
  gold,
}: {
  label: string;
  value: string;
  borderLeft?: boolean;
  borderTop?: boolean;
  gold?: boolean;
}) {
  return (
    <div
      className={`px-4 py-4 ${borderLeft ? 'border-l border-[var(--ink-2)]' : ''} ${borderTop ? 'border-t border-[var(--ink-2)]' : ''}`}
    >
      <div
        className="text-[9px] tracking-[0.2em] text-[var(--ink-4)] mb-1"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </div>
      <div
        className={`text-[28px] font-light tracking-tight ${gold ? 'text-[var(--signal-gold)]' : 'text-[var(--paper-3)]'}`}
        style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}
      >
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info Band — 3-column feature grid                                  */
/* ------------------------------------------------------------------ */
function InfoBand() {
  const items = [
    {
      symbol: '◇',
      heading: 'OPERATOR ROUTE',
      body: 'Each signal includes extraction notes — wedge / channel / pricing — written for builders.',
    },
    {
      symbol: '◎',
      heading: 'MULTILINGUAL CORE',
      body: 'Cases re-broadcast in 9 languages. AI-translated. Switch language without losing context.',
    },
    {
      symbol: '◐',
      heading: 'USER FIELD NOTES',
      body: 'Submit your own case. Reviewed within 48h. Verified MRR earns the green source-mark.',
    },
  ];

  return (
    <section className="bg-[rgba(20,20,22,0.3)] border-t border-b border-[var(--ink-2)]">
      <div className="mx-auto max-w-6xl px-10 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {items.map((item) => (
          <div key={item.heading}>
            <div className="text-[24px] text-[var(--signal-gold)] mb-2">{item.symbol}</div>
            <div
              className="text-[10px] tracking-[0.2em] text-[var(--paper-3)] mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {item.heading}
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--paper-1)]">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function Home() {
  const { t } = useI18n();

  return (
    <div>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden border-b border-[var(--ink-2)]">
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 100%)',
          }}
        />

        {/* Radar decoration */}
        <RadarSVG />

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-10 pt-16 pb-10">
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-[60px] items-end">
            {/* Left column */}
            <div>
              {/* Status line */}
              <div className="flex items-center gap-2 mb-6">
                <span className="relative flex h-[7px] w-[7px]">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--signal-live)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[var(--signal-live)]" />
                </span>
                <span
                  className="text-[11px] tracking-[0.18em] text-[var(--ink-5)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  SCANNING &mdash; HN &middot; PH &middot; REDDIT &middot; X &middot; USER
                </span>
              </div>

              {/* Headline */}
              <h1
                className="text-[40px] md:text-[56px] xl:text-[76px] leading-[1.05] tracking-[-0.03em] text-[var(--paper-3)] mb-6"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}
              >
                Today&rsquo;s{' '}
                <em className="not-italic text-[var(--signal-gold)]" style={{ fontStyle: 'italic' }}>
                  monetization signal
                </em>
                ,
                <br />
                translated into your
                <br />
                operating language.
              </h1>

              {/* Lede */}
              <p className="text-[16px] leading-relaxed text-[var(--paper-1)] max-w-[580px]">
                {t.hero.subtitle}
              </p>
            </div>

            {/* Right column — Digest Panel */}
            <DigestPanel />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  INFO BAND                                                    */}
      {/* ============================================================ */}
      <InfoBand />

      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <section className="border-t border-b border-[var(--ink-2)] py-20">
        <div className="mx-auto max-w-4xl px-10 text-center">
          <h2
            className="text-[28px] md:text-[36px] tracking-[-0.02em] text-[var(--paper-3)] mb-4"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}
          >
            {t.cta.title}
          </h2>
          <p className="text-[var(--paper-1)] mb-10 text-[16px] max-w-xl mx-auto">
            {t.cta.subtitle}
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[var(--signal-gold)] text-[var(--ink-0)] px-8 py-3.5 text-[13px] tracking-[0.06em] uppercase font-medium hover:brightness-110 transition-all"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.cta.button} &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
