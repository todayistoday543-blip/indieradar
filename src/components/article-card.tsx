'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useI18n } from '@/i18n/context';
import { useUser } from '@/components/user-context';
import { timeAgo } from '@/lib/time-ago';
import { formatMrr } from '@/lib/format-mrr';

interface Article {
  id: string;
  source: string;
  original_title?: string;
  // English base
  en_title?: string;
  en_summary?: string;
  en_insight?: string;
  // Japanese
  ja_title?: string;
  ja_summary?: string;
  ja_insight?: string;
  // Spanish
  es_title?: string;
  es_summary?: string;
  es_insight?: string;
  ja_difficulty: string;
  business_model?: string | null;
  mrr_mentioned: number | null;
  upvotes: number;
  is_premium: boolean;
  original_url: string;
  author_profile_url?: string | null;
  created_at: string;
}

/* ── Source icon SVGs (self-made, copyright-safe) ──────────── */

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

/* ── Article-type icons for non-case-study articles ─────────── */

function MindsetIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ink-5)" strokeWidth={1.5} className="shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function NewsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ink-5)" strokeWidth={1.5} className="shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  );
}

function StoryIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ink-5)" strokeWidth={1.5} className="shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

/** Classify non-case-study articles into sub-types based on title heuristics */
function getArticleTypeIcon(title: string): 'mindset' | 'news' | 'story' {
  const t = title.toLowerCase();
  // News / current events
  if (/\b(warning|announced?|launch|update|released?|report|study|data|survey|industry)\b/.test(t) ||
      /trump|政治|ニュース|速報|announcement/.test(t)) {
    return 'news';
  }
  // Experience / personal story
  if (/\b(i quit|i left|my journey|my experience|my story|tell hn|経験|体験|quit my job|bootstrapp?|i built|i made|i started|i failed|失敗|成功)\b/.test(t) ||
      /ask hn.*losing|ask hn.*when do you/.test(t)) {
    return 'story';
  }
  // Default: mindset / opinion
  return 'mindset';
}

/* ── Heat calculation ────────────────────────────────────────── */

function getHeat(upvotes: number): number {
  if (upvotes > 500) return 5;
  if (upvotes > 100) return 4;
  if (upvotes > 50) return 3;
  if (upvotes > 10) return 2;
  return 1;
}

/* ── Component ───────────────────────────────────────────────── */

export function ArticleCard({ article, bookmarkedInit }: { article: Article; bookmarkedInit?: boolean }) {
  const { t, locale } = useI18n();
  const { userId } = useUser();
  const [bookmarked, setBookmarked] = useState(bookmarkedInit ?? false);
  const [bmLoading, setBmLoading] = useState(false);

  const toggleBookmark = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!userId || bmLoading) return;
      const prev = bookmarked;
      setBookmarked(!prev);
      setBmLoading(true);
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, article_id: article.id }),
        });
        if (!res.ok) setBookmarked(prev);
        else {
          const d = await res.json();
          setBookmarked(d.action === 'added');
        }
      } catch {
        setBookmarked(prev);
      } finally {
        setBmLoading(false);
      }
    },
    [userId, article.id, bmLoading, bookmarked],
  );

  const heat = getHeat(article.upvotes);
  const Icon = sourceIcon[article.source];
  const srcLabel = sourceLabel[article.source] || article.source.toUpperCase();

  const hasMrr = article.mrr_mentioned != null && article.mrr_mentioned > 0;

  // Case-study articles have real revenue data or a known business model.
  // Everything else is mindset / experience content.
  const isCaseStudy = hasMrr || !!article.business_model;

  // Trilingual display: pick title for current locale with fallback chain.
  const displayTitle =
    locale === 'ja'
      ? (article.ja_title || article.en_title || article.original_title || 'Untitled')
      : locale === 'es'
      ? (article.es_title || article.en_title || article.original_title || 'Untitled')
      : (article.en_title || article.ja_title || article.original_title || 'Untitled');

  // Pick the summary for the current locale (used for card preview blurb).
  // Non-Japanese locales must NOT fall back to ja_summary — showing Japanese
  // text to English/Spanish readers is worse than showing nothing.
  const rawSummary =
    locale === 'ja'
      ? (article.ja_summary || article.en_summary || '')
      : locale === 'es'
      ? (article.es_summary || article.en_summary || '')
      : (article.en_summary || '');

  const descText = rawSummary
    ? rawSummary
        // Strip HTML tags (original_content may contain HTML)
        .replace(/<[^>]*>/g, '')
        // Decode common HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        // Strip Markdown inline syntax
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [text](url) → text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')  // ![alt](url) → alt
        .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold** → bold
        .replace(/\*([^*]+)\*/g, '$1')              // *italic* → italic
        .replace(/`([^`]+)`/g, '$1')               // `code` → code
        // Remove ## section headings
        .replace(/^#{1,3}\s+.+$/gm, '')
        // Remove leading bullet/dash markers
        .replace(/^[-*]\s+/gm, '')
        // Collapse multiple blank lines / newlines into space
        .replace(/\n{2,}/g, ' ')
        .replace(/\n/g, ' ')
        .trim()
        .slice(0, 120)
    : '';

  // Localize the difficulty label (DB stores English: 'Easy'|'Medium'|'Hard')
  const difficultyLabel = article.ja_difficulty
    ? article.ja_difficulty === 'Easy' ? t.articles.diff_easy
      : article.ja_difficulty === 'Medium' ? t.articles.diff_medium
      : article.ja_difficulty === 'Hard' ? t.articles.diff_hard
      : article.ja_difficulty
    : null;

  // Classify non-case-study articles and pick a label + icon
  const articleTypeIcon = isCaseStudy
    ? null
    : getArticleTypeIcon(article.en_title || article.original_title || '');

  const articleTypeLabel = !isCaseStudy
    ? articleTypeIcon === 'news'
      ? (locale === 'ja' ? 'ニュース' : locale === 'es' ? 'Noticias' : 'News')
      : articleTypeIcon === 'story'
      ? (locale === 'ja' ? '経験談' : locale === 'es' ? 'Experiencia' : 'Story')
      : (locale === 'ja' ? 'マインド' : locale === 'es' ? 'Mentalidad' : 'Mindset')
    : null;

  const tags: string[] = [];
  if (!isCaseStudy && articleTypeLabel) tags.push(articleTypeLabel);
  if (difficultyLabel) tags.push(difficultyLabel);
  if (article.business_model) tags.push(article.business_model);

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
      {/* ─── DESKTOP ≥1024 ──────────────────────────────────── */}
      <div
        className="hidden lg:grid items-center gap-0 py-3 px-2"
        style={{ gridTemplateColumns: '40px 1fr 130px 120px 40px' }}
      >
        {/* 1 — Source icon */}
        <span className="flex justify-center">
          {Icon ? <Icon /> : <span className="text-[10px] text-[var(--ink-5)] font-mono">{srcLabel}</span>}
        </span>

        {/* 2 — Content area */}
        <div className="min-w-0 pr-4">
          <h3 className="font-display text-[19px] leading-tight text-[var(--paper-3)] truncate">
            {displayTitle}
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
            <span>{timeAgo(article.created_at, locale)}</span>
            <span>{' · '}</span>
            <span className="uppercase">{srcLabel}</span>
          </p>
        </div>

        {/* 3 — MRR amount OR article-type icon */}
        <div className="flex items-center justify-end pr-3">
          {isCaseStudy ? (
            hasMrr ? (
              <span className="font-display text-[26px] leading-none text-[var(--signal-gold)]">
                {formatMrr(article.mrr_mentioned!)}
              </span>
            ) : (
              <span className="font-display text-[26px] leading-none text-[var(--ink-4)]">
                —
              </span>
            )
          ) : (
            <span className="flex items-center gap-1.5" title={articleTypeLabel || ''}>
              {articleTypeIcon === 'news' ? <NewsIcon /> : articleTypeIcon === 'story' ? <StoryIcon /> : <MindsetIcon />}
              <span className="text-[10px] text-[var(--ink-5)] font-mono tracking-wide">
                {articleTypeIcon === 'news'
                  ? (locale === 'ja' ? 'ニュース' : locale === 'es' ? 'NOTICIAS' : 'NEWS')
                  : articleTypeIcon === 'story'
                  ? (locale === 'ja' ? '経験談' : locale === 'es' ? 'HISTORIA' : 'STORY')
                  : (locale === 'ja' ? 'マインド' : locale === 'es' ? 'MENTE' : 'MIND')}
              </span>
            </span>
          )}
        </div>

        {/* 4 — Heat meter */}
        <div className="flex items-center justify-center gap-[3px]">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={['heat-bar', level <= heat ? `on l${level}` : ''].join(' ')}
            />
          ))}
        </div>

        {/* 5 — Bookmark */}
        {userId ? (
          <button
            onClick={toggleBookmark}
            className={`flex justify-center transition-colors ${bookmarked ? 'text-[var(--signal-gold)]' : 'text-[var(--ink-4)] hover:text-[var(--paper-2)]'}`}
          >
            <svg className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
        ) : (
          <span className="font-mono text-[16px] text-[var(--ink-4)] text-center transition-colors duration-[var(--dur-std)] group-hover:text-[var(--signal-gold)]">
            →
          </span>
        )}
      </div>

      {/* ─── TABLET 768–1023 ────────────────────────────────── */}
      <div
        className="hidden md:grid lg:hidden items-center gap-0 py-3 px-2"
        style={{ gridTemplateColumns: '36px 1fr 100px 100px' }}
      >
        <span className="flex justify-center">
          {Icon ? <Icon /> : <span className="text-[10px] text-[var(--ink-5)] font-mono">{srcLabel}</span>}
        </span>
        <div className="min-w-0 pr-3">
          <h3 className="font-display text-[17px] leading-tight text-[var(--paper-3)] truncate">
            {displayTitle}
          </h3>
          <p className="font-mono text-[10px] text-[var(--ink-5)] mt-0.5 truncate">
            {timeAgo(article.created_at, locale)}
            <span>{' · '}</span>
            <span className="uppercase">{srcLabel}</span>
            {tags.length > 0 && (
              <>
                <span>{' · '}</span>
                <span>{tags.join(' · ')}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center justify-end pr-2">
          {isCaseStudy ? (
            hasMrr ? (
              <span className="font-display text-[22px] leading-none text-[var(--signal-gold)]">
                {formatMrr(article.mrr_mentioned!)}
              </span>
            ) : (
              <span className="font-display text-[22px] leading-none text-[var(--ink-4)]">—</span>
            )
          ) : (
            <span className="flex items-center gap-1" title={articleTypeLabel || ''}>
              {articleTypeIcon === 'news' ? <NewsIcon size={18} /> : articleTypeIcon === 'story' ? <StoryIcon size={18} /> : <MindsetIcon size={18} />}
              <span className="text-[9px] text-[var(--ink-5)] font-mono">
                {articleTypeIcon === 'news'
                  ? (locale === 'ja' ? 'ニュース' : locale === 'es' ? 'NOTICIAS' : 'NEWS')
                  : articleTypeIcon === 'story'
                  ? (locale === 'ja' ? '経験談' : locale === 'es' ? 'HISTORIA' : 'STORY')
                  : (locale === 'ja' ? 'マインド' : locale === 'es' ? 'MENTE' : 'MIND')}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-[2px]">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={['heat-bar', level <= heat ? `on l${level}` : ''].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* ─── MOBILE <768 ──────────────────────────────────── */}
      <div className="md:hidden py-3 px-3">
        <div className="flex items-center gap-2 mb-2">
          {Icon ? <Icon /> : <span className="text-[10px] text-[var(--ink-5)] font-mono">{srcLabel}</span>}
          {isCaseStudy && hasMrr ? (
            <span className="font-display text-[18px] text-[var(--signal-gold)] ml-auto mr-1">
              {formatMrr(article.mrr_mentioned!)}
            </span>
          ) : !isCaseStudy ? (
            <span className="flex items-center gap-1 ml-auto mr-1" title={articleTypeLabel || ''}>
              {articleTypeIcon === 'news' ? <NewsIcon size={16} /> : articleTypeIcon === 'story' ? <StoryIcon size={16} /> : <MindsetIcon size={16} />}
              <span className="text-[9px] text-[var(--ink-5)] font-mono">
                {articleTypeIcon === 'news'
                  ? (locale === 'ja' ? 'ニュース' : locale === 'es' ? 'NOTICIAS' : 'NEWS')
                  : articleTypeIcon === 'story'
                  ? (locale === 'ja' ? '経験談' : locale === 'es' ? 'HISTORIA' : 'STORY')
                  : (locale === 'ja' ? 'マインド' : locale === 'es' ? 'MENTE' : 'MIND')}
              </span>
            </span>
          ) : null}
          {userId && (
            <button
              onClick={toggleBookmark}
              className={`${!hasMrr && isCaseStudy ? 'ml-auto' : ''} transition-colors ${bookmarked ? 'text-[var(--signal-gold)]' : 'text-[var(--ink-4)]'}`}
            >
              <svg className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </button>
          )}
        </div>
        <h3 className="font-display text-[17px] leading-tight text-[var(--paper-3)] mb-1">
          {displayTitle}
        </h3>
        {descText && (
          <p className="font-sans text-[13px] text-[var(--ink-5)] leading-snug line-clamp-2 mb-1.5">
            {descText}
          </p>
        )}
        <p className="font-mono text-[10px] text-[var(--ink-5)]">
          {timeAgo(article.created_at, locale)}
          <span>{' · '}</span>
          <span className="uppercase">{srcLabel}</span>
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
