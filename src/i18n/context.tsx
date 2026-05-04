'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { type Locale, defaultLocale, locales } from './config';
import type jaMessages from './locales/ja';

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

type Messages = DeepString<typeof jaMessages>;

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
}>({
  locale: defaultLocale,
  setLocale: () => {},
  t: {} as Messages,
});

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  ja: () => import('./locales/ja'),
  en: () => import('./locales/en'),
  zh: () => import('./locales/zh'),
  ko: () => import('./locales/ko'),
  hi: () => import('./locales/hi'),
  de: () => import('./locales/de'),
  es: () => import('./locales/es'),
  fr: () => import('./locales/fr'),
  pt: () => import('./locales/pt'),
};

function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  const saved = localStorage.getItem('ir-locale') as Locale | null;
  if (saved && locales.includes(saved)) return saved;

  const browserLang = navigator.language.split('-')[0] as Locale;
  if (locales.includes(browserLang)) return browserLang;

  return defaultLocale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages | null>(null);

  const loadMessages = useCallback(async (l: Locale) => {
    const mod = await loaders[l]();
    setMessages(mod.default);
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      localStorage.setItem('ir-locale', l);
      document.documentElement.lang = l;
      loadMessages(l);
    },
    [loadMessages]
  );

  useEffect(() => {
    const initial = getSavedLocale();
    setLocaleState(initial);
    document.documentElement.lang = initial;
    loadMessages(initial);
  }, [loadMessages]);

  if (!messages) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
