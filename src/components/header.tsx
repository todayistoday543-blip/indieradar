'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import { LanguageSelector } from './language-selector';
import { ThemeToggle } from './theme-toggle';
import type { User } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/*  IR logo mark                                                       */
/* ------------------------------------------------------------------ */
function IRMark({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="22"
      viewBox="0 0 34 28"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      {/* ── Letter I (slab-serif) ── */}
      <rect x="0" y="0" width="10" height="3" rx="0.5" fill="currentColor" />
      <rect x="3.5" y="0" width="3" height="28" rx="0.5" fill="currentColor" />
      <rect x="0" y="25" width="10" height="3" rx="0.5" fill="currentColor" />

      {/* ── Letter R ── */}
      <rect x="14" y="0" width="3" height="28" rx="0.5" fill="currentColor" />
      <path d="M14 1.5 h10 a6 6 0 0 1 0 12 H14" stroke="currentColor" strokeWidth="3" fill="none" />
      <line x1="22" y1="14" x2="31" y2="27" stroke="#D4A24A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav items                                                          */
/* ------------------------------------------------------------------ */
interface NavItem {
  href: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Auth ----------------------------------------------------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* Scroll --------------------------------------------------------- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  const navItems: NavItem[] = [
    { href: '/articles', label: t.common.articles.toUpperCase() },
    { href: '/weekly', label: t.common.weekly.toUpperCase() },
    { href: '/dashboard', label: 'MRR' },
    { href: '/pricing', label: t.common.pricing.toUpperCase() },
  ];

  return (
    <header
      className="sticky top-0 z-50 h-[60px] flex items-center border-b border-[var(--ink-2)] transition-all duration-300 bg-[var(--ink-0)]/85 backdrop-blur-[12px]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 flex items-center justify-between">
        {/* ---- Logo ------------------------------------------------ */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <IRMark className="text-[var(--paper-2)] group-hover:text-[var(--paper-3)] transition-colors" />
          <span
            className="text-[19px] font-[400] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-[var(--signal-gold)] group-hover:brightness-110 transition-all">I</span>
            <span className="text-[var(--paper-3)]">ndie</span>
            <span className="text-[var(--signal-gold)] group-hover:brightness-110 transition-all">R</span>
            <span className="text-[var(--paper-3)]">adar</span>
          </span>
        </Link>

        {/* ---- Center nav (desktop) -------------------------------- */}
        <nav className="hidden md:flex items-center gap-0">
          {navItems.map((item, i) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-1 text-[13px] tracking-[0.04em] transition-colors ${
                  isActive
                    ? 'text-[var(--signal-gold)]'
                    : 'text-[var(--ink-5)] hover:text-[var(--paper-2)]'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-[-19px] left-0 right-0 h-[2px] bg-[var(--signal-gold)]" />
                )}
                {i < navItems.length - 1 && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-3 bg-[var(--ink-3)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ---- Right side ------------------------------------------ */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language selector — featured prominently */}
          <LanguageSelector />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/bookmarks"
                className="text-[var(--ink-5)] hover:text-[var(--paper-2)] p-1.5 rounded-md hover:bg-[var(--ink-2)] transition-colors"
                title={t.bookmarks.heading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </Link>
              <Link
                href="/settings"
                className="text-[var(--ink-5)] hover:text-[var(--paper-2)] p-1.5 rounded-md hover:bg-[var(--ink-2)] transition-colors"
                title="Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <span className="text-[var(--ink-5)] text-xs hidden lg:inline max-w-[140px] truncate font-mono">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-[var(--ink-5)] hover:text-[var(--paper-2)] text-[13px] tracking-[0.04em] px-3 py-1.5 rounded-md hover:bg-[var(--ink-2)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {t.common.logout.toUpperCase()}
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md bg-[var(--signal-gold)] text-[var(--ink-0)] px-4 py-1.5 text-[13px] tracking-[0.04em] font-medium hover:brightness-110 transition-all"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.common.login.toUpperCase()}
            </Link>
          )}
        </div>

        {/* ---- Mobile hamburger ------------------------------------ */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-md hover:bg-[var(--ink-2)] transition-colors"
          aria-label="Menu"
        >
          <svg
            className="w-5 h-5 text-[var(--paper-2)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* ---- Mobile menu ------------------------------------------- */}
      {menuOpen && (
        <div className="md:hidden absolute top-[60px] left-0 right-0 border-t border-[var(--ink-2)] bg-[var(--ink-0)]/95 backdrop-blur-[12px] animate-fade-in z-40">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block text-[13px] tracking-[0.04em] px-3 py-2.5 rounded-md transition-colors ${
                    isActive
                      ? 'text-[var(--signal-gold)] bg-[var(--ink-2)]'
                      : 'text-[var(--paper-1)] hover:bg-[var(--ink-2)] hover:text-[var(--paper-2)]'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-2 pb-1 px-3 flex items-center gap-3">
              <LanguageSelector />
              <ThemeToggle />
            </div>

            {user ? (
              <div className="pt-3 mt-2 border-t border-[var(--ink-2)] px-3">
                <p className="text-xs text-[var(--ink-5)] mb-2 truncate font-mono">{user.email}</p>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block text-[13px] tracking-[0.04em] text-[var(--paper-1)] hover:text-[var(--paper-2)] mb-2 transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t.settings.heading}
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMenuOpen(false);
                  }}
                  className="text-[13px] tracking-[0.04em] text-[var(--ink-5)] hover:text-[var(--paper-2)] transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t.common.logout.toUpperCase()}
                </button>
              </div>
            ) : (
              <div className="pt-3 mt-2 border-t border-[var(--ink-2)] px-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center rounded-md bg-[var(--signal-gold)] text-[var(--ink-0)] px-4 py-2.5 text-[13px] tracking-[0.04em] font-medium"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t.common.login.toUpperCase()}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
