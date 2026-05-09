export const locales = [
  'ja', 'en', 'es', 'ko', 'zh', 'hi', 'de', 'fr', 'pt',
] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  es: 'Español',
  ko: '한국어',
  zh: '中文',
  hi: 'हिन्दी',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
};

/** Maps app locale codes to BCP-47 tags used by Intl APIs. */
export const localeToBCP47: Record<Locale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  es: 'es-419',
  ko: 'ko-KR',
  zh: 'zh-CN',
  hi: 'hi-IN',
  de: 'de-DE',
  fr: 'fr-FR',
  pt: 'pt-BR',
};

export const defaultLocale: Locale = 'en';
