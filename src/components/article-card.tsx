'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/context';
import { timeAgo } from '@/lib/time-ago';

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

/* ── Source badge config ─────────────────────────────────────── */

const sourceBadge: Record<string, { label: string; cls: string }> = {
  hackernews:   { label: 'HN',     cls: 'src-badge src-badge-hn' },
  producthunt:  { label: 'PH',     cls: 'src-badge src-badge-ph' },
  reddit:       { label: 'REDDIT', cls: 'src-badge src-badge-reddit' },
  x:            { label: 'X',      cls: 'src-badge src-badge-x' },
  user:         { label: 'USER',   cls: 'src-badge src-badge-user' },
};

/* ── Heat calculation ────────────────────────────────────────── */

function getHeat(upvotes: number): number {
  if (upvotes > 500) return 5;
  if (upvotes > 100) return 4;
  if (upvotes > 50) return 3;
  if (upvotes > 10) return 2;
  return 1;
}

/* ── MRR formatting ──────────────────────────────────────────── */

function formatMrr(mrr: number): string {
  if (mrr >= 1000) {
    const k = mrr / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${mrr}`;
}

/* ── Component ───────────────────────────────────────────────── */

export function ArticleCard({
  article,
  index,
}: {
  article: Article;
  index: number;
}) {
  const { t } = useI18n();

  const heat = getHeat(article.upvotes);
  const badge = sourceBadge[article.source] ?? {
    label: article.source.toUpperCase(),
    cls: 'src-badge src-badge-user',
  };

  const hasMrr =
    article.mrr_mentioned != null && article.mrr_mentioned > 0;

  const descText = article.ja_summary
    ? article.ja_summary.slice(0, 120)
    : '';

  /* tags / meta line pieces */
  const tags: string[] = [];
  if (article.ja_difficulty) tags.push(article.ja_difficulty);

  const sourceType = article.source === 'user'
    ? t.articles.user_post
    : badge.label;

  /* number padded to 3 digits */
  const num = String(index).padStart(3, '0');

  /* language count — fixed at 9 for now (all supported locales) */
  const langTotal = 9;
  /* approximate translated count — for now show full set */
  const langDone = article.ja_title ? langTotal : 0;

  return (
    <Link
      href={`/articles/${article.id}`}
      className={[
        'group block',
        'border-l-2 border-l-transparent',
        'transition-all duration-[var(--dur-std)] ease-[var(--ease)]',
        'hover:bg-[rgba(212,162,74,0.05)] hover:border-l-[var(--signal-gold)]',
      ].join(' ')}
    >
      {/* ─── DESKTOP ≥1280 ────────────────────────────────── */}
      <div
        className="hidden xl:grid items-center gap-0 py-3 px-2"
        style={{
          gridTemplateColumns: '60px 80px 1fr 130px 120px 80px 40px',
        }}
      >
        {/* 1 — Number */}
        <span className="font-mono text-[13px] text-[var(--ink-4)] text-center select-none">
          {num}
        </span>

        {/* 2 — Source badge */}
        <span className="flex justify-center">
          <span className={badge.cls}>{badge.label}</span>
        </span>

        {/* 3 — Content area */}
        <div className="min-w-0 pr-4">
          <h3
            className="font-display text-[19px] leading-tight text-[var(--paper-3)] truncate"
          >
            {article.ja_title || 'Untitled'}
          </h3>
          {descText && (
            <p className="font-sans text-[13px] leading-snug text-[var(--ink-5)] truncate max-w-[660px] mt-0.5">
              {descText}
            </p>
          )}
          <p className="font-mono text-[10px] text-[var(--ink-5)] mt-1 truncate">
            {tags.length > 0 && (
              <>
                <span>{'◇ '}{tags.join(' · ')}</span>
                <span>{' — '}</span>
              </>
            )}
            <span>TR → JP EN</span>
            <span>{' — '}</span>
            <span>{timeAgo(article.created_at)}</span>
            <span>{' · '}</span>
            <span className="uppercase">{sourceType}</span>
          </p>
        </div>

        {/* 4 — MRR amount */}
        <div className="text-right pr-3">
          {hasMrr ? (
            <>
              <span className="font-display text-[26px] leading-none text-[var(--signal-gold)]">
                {formatMrr(article.mrr_mentioned!)}
              </span>
              <span className="block font-mono text-[10px] text-[var(--signal-live)] mt-0.5">
                {article.source === 'user' ? 'NEW' : `+${Math.min(article.upvotes, 99)}%`}
              </span>
            </>
          ) : (
            <span className="font-display text-[26px] leading-none text-[var(--ink-4)]">
              —
            </span>
          )}
        </div>

        {/* 5 — Heat meter */}
        <div className="flex items-center justify-center gap-[3px]">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={[
                'heat-bar',
                level <= heat ? `on l${level}` : '',
              ].join(' ')}
            />
          ))}
        </div>

        {/* 6 — Lang count */}
        <span className="font-mono text-[10px] text-[var(--ink-5)] text-center">
          {langDone}/{langTotal}
        </span>

        {/* 7 — Arrow */}
        <span className="font-mono text-[16px] text-[var(--ink-4)] text-center transition-colors duration-[var(--dur-std)] group-hover:text-[var(--signal-gold)]">
          →
        </span>
      </div>

      {/* ─── TABLET 768–1279 ──────────────────────────────── */}
      <div
        className="hidden md:grid xl:hidden items-center gap-0 py-3 px-2"
        style={{
          gridTemplateColumns: '50px 70px 1fr 100px 100px',
        }}
      >
        {/* Number */}
        <span className="font-mono text-[12px] text-[var(--ink-4)] text-center select-none">
          {num}
        </span>

        {/* Source badge */}
        <span className="flex justify-center">
          <span className={badge.cls}>{badge.label}</span>
        </span>

        {/* Content area */}
        <div className="min-w-0 pr-3">
          <h3 className="font-display text-[17px] leading-tight text-[var(--paper-3)] truncate">
            {article.ja_title || 'Untitled'}
          </h3>
          <p className="font-mono text-[10px] text-[var(--ink-5)] mt-0.5 truncate">
            {timeAgo(article.created_at)}
            <span>{' · '}</span>
            <span className="uppercase">{sourceType}</span>
            {tags.length > 0 && (
              <>
                <span>{' · '}</span>
                <span>{tags.join(' · ')}</span>
              </>
            )}
          </p>
        </div>

        {/* MRR amount */}
        <div className="text-right pr-2">
          {hasMrr ? (
            <span className="font-display text-[22px] leading-none text-[var(--signal-gold)]">
              {formatMrr(article.mrr_mentioned!)}
            </span>
          ) : (
            <span className="font-display text-[22px] leading-none text-[var(--ink-4)]">
              —
            </span>
          )}
        </div>

        {/* Heat meter */}
        <div className="flex items-center justify-center gap-[2px]">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={[
                'heat-bar',
                level <= heat ? `on l${level}` : '',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* ─── MOBILE <768 ──────────────────────────────────── */}
      <div className="md:hidden py-3 px-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={badge.cls}>{badge.label}</span>
          {hasMrr && (
            <span className="font-display text-[18px] text-[var(--signal-gold)] ml-auto">
              {formatMrr(article.mrr_mentioned!)}
            </span>
          )}
        </div>
        <h3 className="font-display text-[17px] leading-tight text-[var(--paper-3)] mb-1">
          {article.ja_title || 'Untitled'}
        </h3>
        {descText && (
          <p className="font-sans text-[13px] text-[var(--ink-5)] leading-snug line-clamp-2 mb-1.5">
            {descText}
          </p>
        )}
        <p className="font-mono text-[10px] text-[var(--ink-5)]">
          {timeAgo(article.created_at)}
          <span>{' · '}</span>
          <span className="uppercase">{sourceType}</span>
          {tags.length > 0 && (
            <>
              <span>{' · '}</span>
              <span>{tags.join(' · ')}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
