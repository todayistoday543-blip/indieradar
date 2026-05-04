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
  business_model: string | null;
  mrr_mentioned: number | null;
  upvotes: number;
  is_premium: boolean;
  original_url: string;
  author_profile_url: string | null;
  created_at: string;
}

/* ── Source icon SVGs (self-made, copyright-safe) ──────────── */

function HNIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FF6600" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="15" fontWeight="bold" fill="white">Y</text>
    </svg>
  );
}

function RedditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#FF4500" />
      <circle cx="12" cy="13" r="5" fill="white" />
      <circle cx="9.5" cy="12" r="1.2" fill="#FF4500" />
      <circle cx="14.5" cy="12" r="1.2" fill="#FF4500" />
      <path d="M9 15c0 0 1.5 1.5 3 1.5s3-1.5 3-1.5" stroke="#FF4500" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <circle cx="17" cy="7" r="1.5" fill="#FF4500" />
      <line x1="14" y1="5" x2="17" y2="7" stroke="#FF4500" strokeWidth="1" />
      <circle cx="14" cy="5" r="1" fill="#FF4500" />
    </svg>
  );
}

function PHIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#DA552F" />
      <path d="M10 7h3.5a3.5 3.5 0 010 7H10V7z" fill="white" />
      <rect x="8" y="7" width="2" height="10" rx="0.5" fill="white" />
    </svg>
  );
}

function IHIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#4F46E5" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="bold" fill="white">IH</text>
    </svg>
  );
}

const SOURCE_TABS = [
  { value: '',              label: 'All',            icon: null },
  { value: 'hackernews',    label: 'Hacker News',    icon: HNIcon },
  { value: 'reddit',        label: 'Reddit',         icon: RedditIcon },
  { value: 'producthunt',   label: 'Product Hunt',   icon: PHIcon },
  { value: 'indiehackers',  label: 'Indie Hackers',  icon: IHIcon },
];

// Columns: ICON | SIGNAL · EXTRACTION | MRR | HEAT | →
const LIST_COLUMNS = '40px 1fr 130px 120px 40px';

const SORT_OPTIONS = [
  { value: 'new', label: 'NEW' },
  { value: 'heat', label: 'HEAT' },
  { value: 'upvotes', label: 'UPVOTES' },
  { value: 'views', label: 'VIEWS' },
];

export default function ArticlesPage() {
  const { t } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [sort, setSort] = useState<string>('new');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), sort });
      if (source) params.set('source', source);

      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotalPages(data.totalPages || 1);
      setLoading(false);
    }
    load();
  }, [page, source, sort]);

  return (
    <div className="min-h-screen">
      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div
        className="border-b border-[var(--ink-2)] overflow-x-auto"
        style={{ padding: '20px 40px' }}
      >
        <div className="flex items-center gap-4 min-w-max">
          <span
            className="text-[11px] tracking-[0.2em] text-[var(--ink-4)] shrink-0 uppercase"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            SOURCE_
          </span>

          <div className="flex items-center gap-2">
            {SOURCE_TABS.map((tab) => {
              const isActive = source === tab.value;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSource(tab.value);
                    setPage(1);
                  }}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-[0.06em] transition-all
                    ${
                      isActive
                        ? 'bg-[var(--paper-3)] text-[var(--ink-0)] border border-[var(--paper-3)] font-semibold'
                        : 'bg-transparent text-[var(--paper-1)] border border-[var(--ink-3)] hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]'
                    }
                  `}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {Icon && <Icon size={14} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3 shrink-0">
            <span
              className="text-[11px] tracking-[0.2em] text-[var(--ink-4)] shrink-0 uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              SORT_
            </span>
            <div className="flex items-center gap-1.5">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setPage(1); }}
                  className={`px-2.5 py-1 text-[11px] tracking-[0.06em] transition-all ${
                    sort === opt.value
                      ? 'bg-[var(--paper-3)] text-[var(--ink-0)] border border-[var(--paper-3)] font-semibold'
                      : 'bg-transparent text-[var(--paper-1)] border border-[var(--ink-3)] hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
          {['', 'SIGNAL · EXTRACTION', 'MRR · Δ7D', 'HEAT', ''].map(
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
                style={{ gridTemplateColumns: LIST_COLUMNS }}
              >
                <div className="skeleton h-5 w-5 rounded max-md:hidden" />
                <div className="space-y-2 max-md:space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-3 w-16 max-md:hidden" />
                <div className="flex gap-0.5 max-md:hidden">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="skeleton w-[14px] h-[24px]" />
                  ))}
                </div>
                <div className="max-md:hidden" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-6 text-center animate-fade-in">
            <svg
              width="80"
              height="80"
              viewBox="0 0 180 180"
              aria-hidden="true"
              className="text-[var(--ink-3)] mb-6"
            >
              <g transform="translate(90 90)">
                <circle r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
                <circle r="50" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
                <circle r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
                <line x1="0" y1="0" x2="0" y2="-70" stroke="var(--ink-4)" strokeWidth="1" />
                <line x1="0" y1="0" x2="60" y2="-35" stroke="var(--signal-gold)" strokeWidth="1.5" strokeOpacity="0.6" />
                <circle r="3" fill="var(--signal-gold)" opacity="0.6" />
              </g>
            </svg>
            <p className="text-[var(--ink-5)] text-lg mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              {t.articles.empty}
            </p>
            <p className="text-[var(--ink-4)] text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
              {t.articles.empty_desc}
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
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
