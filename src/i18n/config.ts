export const locales = [
  'ja', 'en', 'zh', 'ko', 'hi', 'de', 'es', 'fr', 'pt',
] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  zh: '中文',
  ko: '한국어',
  hi: 'हिन्दी',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

export const defaultLocale: Locale = 'ja';
