'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/context';
import { LanguageSelector } from './language-selector';
import type { User } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/*  Aperture logo mark                                                 */
/* ------------------------------------------------------------------ */
function ApertureMark({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 180 180"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(90 90)">
        <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="6">
          <line x1="0" y1="-46" x2="0" y2="-58" />
          <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(60)" />
          <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(120)" />
          <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(180)" />
          <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(240)" />
          <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(300)" />
        </g>
        <circle r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeOpacity="0.6" />
        <circle r="22" fill="none" stroke="#D4A24A" strokeWidth="6" />
        <line x1="-6" y1="-22" x2="-6" y2="22" stroke="#D4A24A" strokeWidth="6" />
        <line x1="6" y1="-22" x2="6" y2="22" stroke="#D4A24A" strokeWidth="6" />
        <circle r="6" fill="#D4A24A" />
      </g>
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
    { href: '/submit', label: t.common.submit.toUpperCase() },
    { href: '/pricing', label: t.common.pricing.toUpperCase() },
  ];

  return (
    <header
      className={`sticky top-0 z-50 h-[60px] flex items-center border-b border-[var(--ink-2)] transition-all duration-300 ${
        scrolled
          ? 'bg-[rgba(11,11,12,0.85)] backdrop-blur-[12px]'
          : 'bg-[rgba(11,11,12,0.85)] backdrop-blur-[12px]'
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 flex items-center justify-between">
        {/* ---- Logo ------------------------------------------------ */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <ApertureMark className="text-[var(--paper-2)] group-hover:text-[var(--signal-gold)] transition-colors" />
          <span
            className="text-[19px] font-[400] tracking-tight text-[var(--paper-3)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            IndieRadar
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
          {/* LIVE indicator */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--signal-live)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--signal-live)]" />
            </span>
            <span
              className="text-[11px] tracking-[0.06em] text-[var(--signal-live)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              LIVE
            </span>
          </div>

          {/* Language selector */}
          <LanguageSelector />

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-2">
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
        <div className="md:hidden absolute top-[60px] left-0 right-0 border-t border-[var(--ink-2)] bg-[var(--ink-1)]/95 backdrop-blur-[12px] animate-fade-in z-40">
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

            {/* LIVE indicator (mobile) */}
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--signal-live)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--signal-live)]" />
              </span>
              <span
                className="text-[11px] tracking-[0.06em] text-[var(--signal-live)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                LIVE
              </span>
            </div>

            <div className="pt-2 pb-1 px-3">
              <LanguageSelector />
            </div>

            {user ? (
              <div className="pt-3 mt-2 border-t border-[var(--ink-2)] px-3">
                <p className="text-xs text-[var(--ink-5)] mb-2 truncate font-mono">{user.email}</p>
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
