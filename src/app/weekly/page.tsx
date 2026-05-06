'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/context';
import { timeAgo } from '@/lib/time-ago';
import { formatMrr } from '@/lib/format-mrr';

/* ── Types ────────────────────────────────────────────────────── */

interface RankedArticle {
  id: string;
  source: string;
  original_title?: string;
  ja_title: string;
  ja_summary: string;
  ja_insight: string;
  ja_difficulty: string;
  business_model: string | null;
  mrr_mentioned: number | null;
  upvotes: number;
  upvote_count: number;
  view_count: number;
  is_premium: boolean;
  original_url: string;
  created_at: string;
  combined_score: number;
}

/* ── Source icon SVGs (same as article-card) ───────────────────── */

function HNIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect width="24" height="24" rx="4" fill="#FF6600" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="15" fontWeight="bold" fill="white">Y</text>
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#FF4500" />
      <circle cx="12" cy="13" r="5" fill="white" />
      <circle cx="9.5" cy="12" r="1.2" fill="#FF4500" />
      <circle cx="14.5" cy="12" r="1.2" fill="#FF4500" />
      <path d="M9 15c0 0 1.5 1.5 3 1.5s3-1.5 3-1.5" stroke="#FF4500" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function PHIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#DA552F" />
      <path d="M10 7h3.5a3.5 3.5 0 010 7H10V7z" fill="white" />
      <rect x="8" y="7" width="2" height="10" rx="0.5" fill="white" />
    </svg>
  );
}

function IHIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect width="24" height="24" rx="4" fill="#4F46E5" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="bold" fill="white">IH</text>
    </svg>
  );
}

const sourceIcon: Record<string, () => React.ReactNode> = {
  hackernews: HNIcon,
  reddit: RedditIcon,
  producthunt: PHIcon,
  indiehackers: IHIcon,
};

const sourceLabel: Record<string, string> = {
  hackernews: 'HN',
  reddit: 'Reddit',
  producthunt: 'PH',
  indiehackers: 'IH',
};

/* ── Helpers ──────────────────────────────────────────────────── */


/** Medal emoji for ranks 1-3 */
function rankBadge(rank: number): string {
  if (rank === 1) return '\u{1F947}'; // gold
  if (rank === 2) return '\u{1F948}'; // silver
  if (rank === 3) return '\u{1F949}'; // bronze
  return '';
}

function formatWeekLabel(isoDate: string, locale: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function WeeklyPage() {
  const { t, locale } = useI18n();
  const [articles, setArticles] = useState<RankedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  // Force re-fetch when navigating back (Next.js router cache keeps the component alive)
  useEffect(() => {
    function handlePopState() {
      setRefreshTick((t) => t + 1);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (weekOffset !== 0) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + weekOffset * 7);
        params.set('week', d.toISOString().split('T')[0]);
      }
      const res = await fetch(`/api/weekly?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setWeekStart(data.week_start || '');
      setWeekEnd(data.week_end || '');
      setLoading(false);
    }
    load();
  }, [weekOffset, refreshTick]);

  const weekLabel =
    weekOffset === 0
      ? t.weekly.this_week
      : weekStart && weekEnd
        ? `${formatWeekLabel(weekStart, locale)} - ${formatWeekLabel(weekEnd, locale)}`
        : '';

  return (
    <div className="min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="border-b border-[var(--ink-2)] py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1
            className="text-[28px] sm:text-[36px] font-[400] text-[var(--paper-3)] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t.weekly.heading}
          </h1>
          <p
            className="text-[13px] text-[var(--ink-5)] tracking-[0.04em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.weekly.subtitle}
          </p>
        </div>
      </div>

      {/* ── Week Navigation ─────────────────────────────────── */}
      <div className="border-b border-[var(--ink-2)] py-3 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="flex items-center gap-1.5 border border-[var(--ink-3)] text-[var(--paper-1)] px-4 py-1.5 text-[12px] tracking-[0.06em] transition-all hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span>{'<'}</span>
            <span className="hidden sm:inline">{t.weekly.prev_week}</span>
          </button>

          <span
            className="text-[13px] text-[var(--signal-gold)] tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {weekLabel}
          </span>

          <button
            onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
            disabled={weekOffset >= 0}
            className="flex items-center gap-1.5 border border-[var(--ink-3)] text-[var(--paper-1)] px-4 py-1.5 text-[12px] tracking-[0.06em] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:border-[var(--ink-4)] hover:text-[var(--paper-3)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span className="hidden sm:inline">{t.weekly.next_week}</span>
            <span>{'>'}</span>
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
        {loading ? (
          /* Skeleton loader */
          <div className="space-y-2 animate-fade-in">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-4 px-4 border-b border-[var(--ink-1)]"
              >
                <div className="skeleton h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          /* Empty state */
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
            <p
              className="text-[var(--ink-5)] text-lg mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.weekly.no_data}
            </p>
          </div>
        ) : (
          /* Ranking list */
          <div className="animate-fade-in">
            {/* Column headers (desktop) */}
            <div
              className="hidden md:grid items-center border-b border-[var(--ink-2)] py-2.5 px-3"
              style={{
                gridTemplateColumns: '56px 36px 1fr 100px 80px 60px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span className="text-[9px] tracking-[0.2em] text-[var(--ink-4)] uppercase">
                {t.weekly.rank}
              </span>
              <span />
              <span className="text-[9px] tracking-[0.2em] text-[var(--ink-4)] uppercase">
                SIGNAL
              </span>
              <span className="text-[9px] tracking-[0.2em] text-[var(--ink-4)] uppercase text-right">
                MRR
              </span>
              <span className="text-[9px] tracking-[0.2em] text-[var(--ink-4)] uppercase text-right">
                VIEWS
              </span>
              <span className="text-[9px] tracking-[0.2em] text-[var(--ink-4)] uppercase text-right">
                {t.weekly.score}
              </span>
            </div>

            {articles.map((article, idx) => {
              const rank = idx + 1;
              const Icon = sourceIcon[article.source];
              const srcLabel = sourceLabel[article.source] || article.source.toUpperCase();
              const hasMrr = article.mrr_mentioned != null && article.mrr_mentioned > 0;
              const displayTitle =
                locale === 'ja'
                  ? article.ja_title || article.original_title || 'Untitled'
                  : article.original_title || article.ja_title || 'Untitled';
              const medal = rankBadge(rank);
              const isTop3 = rank <= 3;

              return (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className={[
                    'group block transition-all duration-200',
                    'border-l-2',
                    isTop3
                      ? 'border-l-[var(--signal-gold)] bg-[rgba(201,169,78,0.03)]'
                      : 'border-l-transparent',
                    'hover:bg-[rgba(212,162,74,0.05)] hover:border-l-[var(--signal-gold)]',
                  ].join(' ')}
                >
                  {/* ─── DESKTOP ≥768 ───────────────────────────── */}
                  <div
                    className="hidden md:grid items-center py-3.5 px-3 border-b border-[var(--ink-1)]"
                    style={{ gridTemplateColumns: '56px 36px 1fr 100px 80px 60px' }}
                  >
                    {/* Rank */}
                    <div className="flex items-center gap-1.5">
                      {medal ? (
                        <span className="text-[20px] leading-none">{medal}</span>
                      ) : (
                        <span
                          className="text-[20px] font-[500] text-[var(--ink-4)] tabular-nums leading-none"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {String(rank).padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    {/* Source icon */}
                    <span className="flex justify-center">
                      {Icon ? (
                        <Icon />
                      ) : (
                        <span className="text-[10px] text-[var(--ink-5)] font-mono">
                          {srcLabel}
                        </span>
                      )}
                    </span>

                    {/* Content */}
                    <div className="min-w-0 pr-4">
                      <h3 className="font-display text-[17px] leading-tight text-[var(--paper-3)] truncate">
                        {displayTitle}
                      </h3>
                      <p className="font-mono text-[10px] text-[var(--ink-5)] mt-0.5 truncate">
                        {timeAgo(article.created_at)}
                        {' · '}
                        <span className="uppercase">{srcLabel}</span>
                        {article.business_model && (
                          <>
                            {' · '}
                            {article.business_model}
                          </>
                        )}
                      </p>
                    </div>

                    {/* MRR */}
                    <div className="text-right">
                      {hasMrr ? (
                        <span
                          className="text-[22px] leading-none text-[var(--signal-gold)]"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {formatMrr(article.mrr_mentioned!)}
                        </span>
                      ) : (
                        <span
                          className="text-[22px] leading-none text-[var(--ink-4)]"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          —
                        </span>
                      )}
                    </div>

                    {/* Views */}
                    <div className="text-right">
                      <span
                        className="text-[13px] text-[var(--ink-5)] tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {(article.view_count ?? 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <span
                        className={`text-[14px] font-[500] tabular-nums ${
                          isTop3 ? 'text-[var(--signal-gold)]' : 'text-[var(--paper-1)]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {article.combined_score.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* ─── MOBILE <768 ────────────────────────────── */}
                  <div className="md:hidden py-3.5 px-3 border-b border-[var(--ink-1)]">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Rank badge */}
                      <div className="flex items-center justify-center w-8 shrink-0">
                        {medal ? (
                          <span className="text-[20px] leading-none">{medal}</span>
                        ) : (
                          <span
                            className="text-[20px] font-[500] text-[var(--ink-4)] tabular-nums"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Source icon */}
                      {Icon ? (
                        <Icon />
                      ) : (
                        <span className="text-[10px] text-[var(--ink-5)] font-mono">
                          {srcLabel}
                        </span>
                      )}

                      {/* Score + MRR on the right */}
                      <div className="ml-auto flex items-center gap-3">
                        {hasMrr && (
                          <span
                            className="text-[18px] text-[var(--signal-gold)]"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {formatMrr(article.mrr_mentioned!)}
                          </span>
                        )}
                        <span
                          className={`text-[13px] font-[500] tabular-nums ${
                            isTop3 ? 'text-[var(--signal-gold)]' : 'text-[var(--paper-1)]'
                          }`}
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {article.combined_score.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <h3
                      className="text-[16px] leading-tight text-[var(--paper-3)] mb-1"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {displayTitle}
                    </h3>

                    <p
                      className="text-[10px] text-[var(--ink-5)]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {timeAgo(article.created_at)}
                      {' · '}
                      <span className="uppercase">{srcLabel}</span>
                      {' · '}
                      {(article.view_count ?? 0).toLocaleString()} views
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
