'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';

/* ── Types ────────────────────────────────────────────────── */

interface ByEntry {
  count: number;
  avg_mrr: number;
}

interface DistBucket {
  range: string;
  count: number;
}

interface TopEarner {
  id: string;
  ja_title: string;
  mrr_mentioned: number;
  source: string;
}

interface DashboardData {
  total_articles: number;
  mrr_articles: number;
  avg_mrr: number;
  median_mrr: number;
  by_source: Record<string, ByEntry>;
  by_category: Record<string, ByEntry>;
  by_difficulty: Record<string, ByEntry>;
  mrr_distribution: DistBucket[];
  top_earners: TopEarner[];
}

/* ── Source SVG Icons ────────────────────────────────────── */

function HNIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FF6600" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="15" fontWeight="bold" fill="white">Y</text>
    </svg>
  );
}

function RedditIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#FF4500" />
      <circle cx="12" cy="13" r="5" fill="white" />
      <circle cx="9.5" cy="12" r="1.2" fill="#FF4500" />
      <circle cx="14.5" cy="12" r="1.2" fill="#FF4500" />
      <path d="M9 15c0 0 1.5 1.5 3 1.5s3-1.5 3-1.5" stroke="#FF4500" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function PHIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#DA552F" />
      <path d="M10 7h3.5a3.5 3.5 0 010 7H10V7z" fill="white" />
      <rect x="8" y="7" width="2" height="10" rx="0.5" fill="white" />
    </svg>
  );
}

function IHIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#4F46E5" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="bold" fill="white">IH</text>
    </svg>
  );
}

const SOURCE_META: Record<string, { icon: typeof HNIcon; color: string; label: string }> = {
  hackernews:   { icon: HNIcon,     color: '#FF6600', label: 'Hacker News' },
  reddit:       { icon: RedditIcon,  color: '#FF4500', label: 'Reddit' },
  producthunt:  { icon: PHIcon,      color: '#DA552F', label: 'Product Hunt' },
  indiehackers: { icon: IHIcon,      color: '#4F46E5', label: 'Indie Hackers' },
};

const CATEGORY_I18N_MAP: Record<string, string> = {
  saas: 'cat_saas',
  marketplace: 'cat_marketplace',
  ecommerce: 'cat_ecommerce',
  api: 'cat_api',
  digital_products: 'cat_digital_products',
  services: 'cat_services',
  content: 'cat_content',
  community: 'cat_community',
  opensource: 'cat_opensource',
  hardware: 'cat_hardware',
  subscription: 'cat_subscription',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#7BA88F',
  Medium: '#D4A24A',
  Hard: '#C9695C',
};

/* ── Helpers ─────────────────────────────────────────────── */

function formatMrr(value: number): string {
  if (value >= 100000) return `$${Math.round(value / 1000)}K`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${value.toLocaleString()}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

/* ── Page ────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const dt = t.dashboard;

  /* ── Loading state ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen px-10 max-md:px-6 max-sm:px-4 py-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="skeleton h-8 w-60 mb-3" />
          <div className="skeleton h-4 w-80 mb-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-[var(--ink-2)] p-6">
                <div className="skeleton h-9 w-24 mb-2" />
                <div className="skeleton h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="skeleton h-48 w-full mb-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-28 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--signal-warn)]" style={{ fontFamily: 'var(--font-mono)' }}>
          Error: {error || 'No data'}
        </p>
      </div>
    );
  }

  const maxDist = Math.max(...data.mrr_distribution.map(b => b.count), 1);

  /* Category entries sorted by count descending */
  const categoryEntries = Object.entries(data.by_category)
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="min-h-screen px-10 max-md:px-6 max-sm:px-4 py-12 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">

        {/* ── Header ───────────────────────────────────────── */}
        <h1
          className="text-3xl md:text-4xl text-[var(--paper-3)] mb-2"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
        >
          {dt.heading}
        </h1>
        <p
          className="text-[13px] text-[var(--ink-5)] mb-10"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {dt.subtitle}
        </p>

        {/* ── Section 1: Key Stats ─────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: formatNumber(data.total_articles), label: dt.total_articles },
            { value: formatNumber(data.mrr_articles), label: dt.mrr_articles },
            { value: formatMrr(data.avg_mrr), label: dt.avg_mrr },
            { value: formatMrr(data.median_mrr), label: dt.median_mrr },
          ].map((card, i) => (
            <div
              key={i}
              className="border border-[var(--ink-2)] bg-[var(--ink-1)] p-6 transition-colors hover:border-[var(--ink-3)]"
            >
              <p
                className="text-3xl md:text-4xl text-[var(--signal-gold)] mb-1 tabular-nums"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              >
                {card.value}
              </p>
              <p
                className="text-[11px] tracking-[0.15em] text-[var(--ink-5)] uppercase"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Section 2: MRR Distribution ──────────────────── */}
        <section className="mb-12">
          <h2
            className="text-lg text-[var(--paper-3)] mb-5"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
          >
            {dt.distribution}
          </h2>
          <div className="border border-[var(--ink-2)] bg-[var(--ink-1)] p-6">
            <div className="space-y-3">
              {data.mrr_distribution.map((bucket) => {
                const pct = maxDist > 0 ? (bucket.count / maxDist) * 100 : 0;
                return (
                  <div key={bucket.range} className="flex items-center gap-4">
                    <span
                      className="text-[12px] text-[var(--paper-1)] w-[80px] shrink-0 text-right tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {bucket.range}
                    </span>
                    <div className="flex-1 h-7 bg-[var(--ink-2)] relative overflow-hidden">
                      <div
                        className="h-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.max(pct, bucket.count > 0 ? 2 : 0)}%`,
                          background: 'linear-gradient(90deg, var(--signal-gold), #E8C56A)',
                        }}
                      />
                    </div>
                    <span
                      className="text-[12px] text-[var(--paper-2)] w-[36px] tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {bucket.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 3: By Source ──────────────────────────── */}
        <section className="mb-12">
          <h2
            className="text-lg text-[var(--paper-3)] mb-5"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
          >
            {dt.by_source}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(SOURCE_META).map(([key, meta]) => {
              const entry = data.by_source[key] || { count: 0, avg_mrr: 0 };
              const Icon = meta.icon;
              return (
                <div
                  key={key}
                  className="border bg-[var(--ink-1)] p-5 transition-colors hover:border-[var(--ink-4)]"
                  style={{ borderColor: `${meta.color}30` }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <Icon size={22} />
                    <span
                      className="text-[12px] text-[var(--paper-2)] tracking-[0.04em]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p
                    className="text-2xl tabular-nums mb-0.5"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: meta.color }}
                  >
                    {formatNumber(entry.count)}
                  </p>
                  <p
                    className="text-[11px] text-[var(--ink-5)] tabular-nums"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {dt.avg_mrr}: {formatMrr(entry.avg_mrr)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 4: By Category ───────────────────────── */}
        <section className="mb-12">
          <h2
            className="text-lg text-[var(--paper-3)] mb-5"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
          >
            {dt.by_category}
          </h2>
          <div className="flex flex-wrap gap-3">
            {categoryEntries.map(([key, entry]) => {
              const i18nKey = CATEGORY_I18N_MAP[key];
              const label = i18nKey
                ? (t.articles as Record<string, string>)[i18nKey] || key
                : key;
              return (
                <div
                  key={key}
                  className="border border-[var(--ink-2)] bg-[var(--ink-1)] px-4 py-3 transition-colors hover:border-[var(--signal-gold)]/40"
                >
                  <span
                    className="text-[12px] text-[var(--paper-2)] tracking-[0.04em]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {label}
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span
                      className="text-[16px] text-[var(--signal-gold)] tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                    >
                      {entry.count}
                    </span>
                    <span
                      className="text-[10px] text-[var(--ink-5)] tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {dt.avg_mrr} {formatMrr(entry.avg_mrr)}
                    </span>
                  </div>
                </div>
              );
            })}
            {categoryEntries.length === 0 && (
              <p
                className="text-[var(--ink-5)] text-[12px]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                --
              </p>
            )}
          </div>
        </section>

        {/* ── Section 5: By Difficulty ─────────────────────── */}
        <section className="mb-12">
          <h2
            className="text-lg text-[var(--paper-3)] mb-5"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
          >
            {dt.by_difficulty}
          </h2>
          <div className="flex flex-wrap gap-4">
            {['Easy', 'Medium', 'Hard'].map((diff) => {
              const entry = data.by_difficulty[diff] || { count: 0, avg_mrr: 0 };
              const color = DIFFICULTY_COLORS[diff];
              return (
                <div
                  key={diff}
                  className="border bg-[var(--ink-1)] px-5 py-4 min-w-[140px] transition-colors hover:border-opacity-60"
                  style={{ borderColor: `${color}50` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className="text-[12px] tracking-[0.06em]"
                      style={{ fontFamily: 'var(--font-mono)', color }}
                    >
                      {diff}
                    </span>
                  </div>
                  <p
                    className="text-2xl tabular-nums"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color }}
                  >
                    {formatNumber(entry.count)}
                  </p>
                  <p
                    className="text-[10px] text-[var(--ink-5)] tabular-nums mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {dt.avg_mrr} {formatMrr(entry.avg_mrr)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 6: Top Earners ───────────────────────── */}
        <section className="mb-12">
          <h2
            className="text-lg text-[var(--paper-3)] mb-5"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
          >
            {dt.top_earners}
          </h2>
          {data.top_earners.length > 0 ? (
            <div className="border border-[var(--ink-2)] bg-[var(--ink-1)] divide-y divide-[var(--ink-2)]">
              {data.top_earners.map((article, i) => {
                const meta = SOURCE_META[article.source];
                const Icon = meta?.icon;
                return (
                  <Link
                    key={article.id}
                    href={`/articles/${article.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--ink-2)]"
                  >
                    <span
                      className="text-[13px] text-[var(--ink-4)] w-[20px] shrink-0 tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {Icon && <Icon size={18} />}
                    <span
                      className="flex-1 text-[13px] text-[var(--paper-2)] truncate"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {article.ja_title}
                    </span>
                    <span
                      className="text-[15px] text-[var(--signal-gold)] tabular-nums shrink-0"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                    >
                      {formatMrr(article.mrr_mentioned)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p
              className="text-[var(--ink-5)] text-[12px]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              --
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
