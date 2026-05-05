'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '@/i18n/context';
import { ThemeProvider } from './theme-context';
import { UserProvider } from './user-context';
import { Header } from './header';
import { Footer } from './footer';
import type { ReactNode } from 'react';

function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <UserProvider>
          <ScrollToTop />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </UserProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
