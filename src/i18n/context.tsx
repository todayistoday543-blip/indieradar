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
import type enMessages from './locales/en';
// Eagerly import the default (en) locale so the initial render never shows a
// full-screen "Loading..." flash for English users (the global default).
import enDefault from './locales/en';

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

type Messages = DeepString<typeof enMessages>;

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
}>({
  locale: defaultLocale,
  setLocale: () => {},
  t: enDefault as Messages,
});

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  ja: () => import('./locales/ja'),
  en: () => Promise.resolve({ default: enDefault as Messages }),
  es: () => import('./locales/es'),
};

function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  const saved = localStorage.getItem('ir-locale') as Locale | null;
  if (saved && locales.includes(saved)) return saved;
  // Default to English regardless of browser language.
  // Users can switch manually via the language selector.
  return defaultLocale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start with en messages so the first render never shows a spinner
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>(enDefault as Messages);

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
    // from the default already rendered; avoids a spurious re-render for en users.
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
