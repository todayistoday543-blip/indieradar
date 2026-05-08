export const locales = [
  'ja', 'en', 'es',
] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  es: 'Español',
};

/** Maps app locale codes to BCP-47 tags used by Intl APIs. */
export const localeToBCP47: Record<Locale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  es: 'es-419',
};

export const defaultLocale: Locale = 'en';
