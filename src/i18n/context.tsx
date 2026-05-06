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
// Eagerly import the default (ja) locale so the initial render never shows a
// full-screen "Loading..." flash for Japanese users (the majority).
import jaDefault from './locales/ja';

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
  t: jaDefault as Messages,
});

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  ja: () => Promise.resolve({ default: jaDefault as Messages }),
  en: () => import('./locales/en'),
  es: () => import('./locales/es'),
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
  // Start with ja messages so the first render never shows a spinner
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>(jaDefault as Messages);

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
    // Only trigger a load (and state update) when the preferred locale differs
    // from the default already rendered; avoids a spurious re-render for ja users.
    if (initial !== defaultLocale) {
      setLocaleState(initial);
      document.documentElement.lang = initial;
      loadMessages(initial);
    } else {
      document.documentElement.lang = initial;
    }
  }, [loadMessages]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
