'use client';

import { useEffect, useState, useRef } from 'react';
import { ArticleCard } from '@/components/article-card';
import { useI18n } from '@/i18n/context';

interface Article {
  id: string;
  source: string;
  original_title?: string;
  en_title?: string;
  en_summary?: string;
  en_insight?: string;
  ja_title?: string;
  ja_summary?: string;
  ja_insight?: string;
  es_title?: string;
  es_summary?: string;
  es_insight?: string;
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

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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

const CATEGORY_KEYS = [
  '', 'saas', 'marketplace', 'ecommerce', 'api', 'digital_products',
  'services', 'content', 'community', 'opensource', 'hardware', 'subscription',
] as const;

const SORT_KEYS = ['priority', 'new', 'revenue', 'easy', 'small', 'heat', 'upvotes', 'views'] as const;

// Columns: ICON | SIGNAL · EXTRACTION | MRR | HEAT | →
const LIST_COLUMNS = '40px 1fr 130px 120px 40px';

export default function ArticlesPage() {
  const { t, locale } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [sort, setSort] = useState<string>('priority');
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const categoryRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Force re-fetch when user navigates back — Next.js App Router keeps client
  // components in its router cache, so deps won't change on back-navigation.
  // popstate fires whenever the browser history stack moves (back / forward).
  useEffect(() => {
    function handlePopState() {
      setRefreshTick((t) => t + 1);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll to top only on deliberate filter / page changes (not back-nav refresh)
  useEffect(() => {
    if (!isFirstRender.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    isFirstRender.current = false;
  }, [page, source, sort, category]);

  // Fetch articles — also re-runs on refreshTick so back-navigation always
  // shows fresh data even when filter state hasn't changed.
  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), sort });
      if (source) params.set('source', source);
      if (category) params.set('category', category);

      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotalPages(data.totalPages || 1);
      setLoading(false);
    }
    load();
  }, [page, source, sort, category, refreshTick]);

  const categoryLabel = (key: string) => {
    if (!key) return t.articles.cat_all;
    return t.articles[`cat_${key}` as keyof typeof t.articles] || key;
  };

  return (
    <div className="min-h-screen">
      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div className="border-b border-[var(--ink-2)]" style={{ padding: '16px 40px' }}>
        {/* Row 1: Source + Category */}
        <div className="flex items-center gap-4 flex-wrap mb-3">
          <span
            className="text-[11px] tracking-[0.2em] text-[var(--ink-4)] shrink-0 uppercase"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.articles.filter_source}
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
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

          {/* Divider */}
          <div className="w-px h-5 bg-[var(--ink-3)] hidden sm:block" />

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] tracking-[0.2em] text-[var(--ink-4)] shrink-0 uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.articles.filter_category}
            </span>
            <div className="relative" ref={categoryRef}>
              <button
                onClick={() => setCategoryOpen(!categoryOpen)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 text-[11px] tracking-[0.06em] transition-all min-w-[140px] justify-between
                  ${
                    category
                      ? 'bg-[var(--signal-gold)]/10 text-[var(--signal-gold)] border border-[var(--signal-gold)]/40'
                      : 'bg-transparent text-[var(--paper-1)] border border-[var(--ink-3)] hover:border-[var(--ink-4)]'
                  }
                `}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span>{categoryLabel(category)}</span>
                <ChevronDown className={`transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryOpen && (
                <div className="absolute top-full left-0 mt-1 w-[200px] bg-[var(--ink-0)] border border-[var(--ink-3)] shadow-lg z-50 max-h-[300px] overflow-y-auto animate-fade-in">
                  {CATEGORY_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCategory(key);
                        setPage(1);
                        setCategoryOpen(false);
                      }}
                      className={`
                        w-full text-left px-3 py-2 text-[12px] tracking-[0.04em] transition-colors
                        ${
                          category === key
                            ? 'bg-[var(--signal-gold)]/10 text-[var(--signal-gold)]'
                            : 'text-[var(--paper-1)] hover:bg-[var(--ink-2)] hover:text-[var(--paper-3)]'
                        }
                      `}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {categoryLabel(key)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Sort options */}
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] tracking-[0.2em] text-[var(--ink-4)] shrink-0 uppercase"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.articles.filter_sort}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SORT_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => { setSort(key); setPage(1); }}
                className={`px-2.5 py-1 text-[11px] tracking-[0.06em] transition-all ${
                  sort === key
                    ? 'bg-[var(--paper-3)] text-[var(--ink-0)] border border-[var(--paper-3)] font-semibold'
                    : 'bg-transparent text-[var(--paper-1)] border border-[var(--ink-3)] hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {t.articles[`sort_${key}` as keyof typeof t.articles]}
              </button>
            ))}
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
          {['', t.articles.col_signal, t.articles.col_mrr, t.articles.col_heat, ''].map(
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
