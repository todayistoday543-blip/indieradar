'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '@/i18n/context';
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
    <I18nProvider>
      <ScrollToTop />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </I18nProvider>
  );
}
