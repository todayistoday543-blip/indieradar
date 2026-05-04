'use client';

import { useEffect, useState } from 'react';
import { ArticleCard } from '@/components/article-card';
import { useI18n } from '@/i18n/context';

interface Article {
  id: string;
  source: string;
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_difficulty: string;
  mrr_mentioned: number | null;
  upvotes: number;
  is_premium: boolean;
  original_url: string;
  created_at: string;
}

const SOURCE_TABS = [
  { value: '', label: 'ALL' },
  { value: 'hackernews', label: 'HN' },
  { value: 'producthunt', label: 'PH' },
  { value: 'reddit', label: 'REDDIT' },
  { value: 'x', label: 'X' },
  { value: 'user', label: 'USER' },
];

const LIST_COLUMNS = '60px 80px 1fr 130px 120px 80px 40px';

export default function ArticlesPage() {
  const { t } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page) });
      if (source) params.set('source', source);

      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotalPages(data.totalPages || 1);
      setLoading(false);
    }
    load();
  }, [page, source]);

  return (
    <div className="min-h-screen">
      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div
        className="border-b border-[var(--ink-2)] overflow-x-auto"
        style={{ padding: '20px 40px' }}
      >
        <div className="flex items-center gap-4 min-w-max">
          {/* SOURCE_ label */}
          <span
            className="text-[11px] tracking-[0.2em] text-[var(--ink-4)] shrink-0 uppercase"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            SOURCE_
          </span>

          {/* Tab buttons */}
          <div className="flex items-center gap-2">
            {SOURCE_TABS.map((tab) => {
              const isActive = source === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSource(tab.value);
                    setPage(1);
                  }}
                  className={`
                    px-3 py-1.5 text-[11px] tracking-[0.1em] uppercase transition-all
                    ${
                      isActive
                        ? 'bg-[var(--paper-3)] text-[var(--ink-0)] border border-[var(--paper-3)] font-semibold'
                        : 'bg-transparent text-[var(--paper-1)] border border-[var(--ink-3)] hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]'
                    }
                  `}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort & Window controls */}
          <div className="flex items-center gap-5 shrink-0">
            <span
              className="text-[11px] tracking-[0.1em] text-[var(--ink-5)] cursor-pointer hover:text-[var(--paper-2)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              SORT_ HEAT &#8964;
            </span>
            <span
              className="text-[11px] tracking-[0.1em] text-[var(--ink-5)] cursor-pointer hover:text-[var(--paper-2)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              WINDOW_ 7D &#8964;
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <div className="px-10 max-md:px-6 max-sm:px-0">
        {/* ── List Header (column labels) ────────────────────── */}
        <div
          className="hidden md:grid items-center border-b border-[var(--ink-2)] py-2.5 px-2"
          style={{
            gridTemplateColumns: LIST_COLUMNS,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {['#', 'SRC', 'SIGNAL · EXTRACTION', 'MRR · Δ7D', 'HEAT', 'LANG', ''].map(
            (label, i) => (
              <span
                key={i}
                className="text-[9px] tracking-[0.2em] text-[var(--ink-4)] uppercase"
              >
                {label}
              </span>
            )
          )}
        </div>

        {/* ── Article Feed ───────────────────────────────────── */}
        {loading ? (
          <div className="animate-fade-in">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid items-center border-b border-[var(--ink-1)] py-4 px-2 max-md:block max-md:py-5 max-md:px-4"
                style={{
                  gridTemplateColumns: LIST_COLUMNS,
                }}
              >
                {/* # */}
                <div className="skeleton h-3 w-5 max-md:hidden" />
                {/* SRC */}
                <div className="skeleton h-5 w-12 max-md:hidden" />
                {/* SIGNAL */}
                <div className="space-y-2 max-md:space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                {/* MRR */}
                <div className="skeleton h-3 w-16 max-md:hidden" />
                {/* HEAT */}
                <div className="flex gap-0.5 max-md:hidden">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="skeleton w-[14px] h-[24px]" />
                  ))}
                </div>
                {/* LANG */}
                <div className="skeleton h-3 w-6 max-md:hidden" />
                {/* Arrow */}
                <div className="max-md:hidden" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          /* ── Empty State ──────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-32 px-6 text-center animate-fade-in">
            {/* Radar icon */}
            <svg
              width="80"
              height="80"
              viewBox="0 0 180 180"
              aria-hidden="true"
              className="text-[var(--ink-3)] mb-6"
            >
              <g transform="translate(90 90)">
                <circle
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
                <circle
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
                <circle
                  r="30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-70"
                  stroke="var(--ink-4)"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="60"
                  y2="-35"
                  stroke="var(--signal-gold)"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />
                <circle r="3" fill="var(--signal-gold)" opacity="0.6" />
              </g>
            </svg>
            <p
              className="text-[var(--ink-5)] text-lg mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.articles.empty}
            </p>
            <p
              className="text-[var(--ink-4)] text-sm"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.articles.empty_desc}
            </p>
          </div>
        ) : (
          /* ── Article Rows ─────────────────────────────────── */
          <div className="animate-fade-in">
            {articles.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={(page - 1) * articles.length + i + 1}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border border-[var(--ink-3)] text-[var(--paper-1)] px-5 py-2 text-[12px] tracking-[0.08em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.articles.prev}
            </button>
            <span
              className="text-[12px] text-[var(--ink-5)] tabular-nums"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border border-[var(--ink-3)] text-[var(--paper-1)] px-5 py-2 text-[12px] tracking-[0.08em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.articles.next}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
