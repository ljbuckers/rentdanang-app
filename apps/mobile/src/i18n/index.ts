import en from './locales/en';

export type TranslationKeys = typeof en;

export const locales = ['en', 'vi', 'ko', 'zh', 'ja', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
  ko: '한국어',
  zh: '中文',
  ja: '日本語',
  ru: 'Русский',
};

export type CurrencyCode = 'VND' | 'USD' | 'GBP' | 'KRW' | 'CNY' | 'JPY' | 'RUB' | 'EUR';

export const currencyLabels: Record<CurrencyCode, string> = {
  VND: '₫ VND',
  USD: '$ USD',
  GBP: '£ GBP',
  KRW: '₩ KRW',
  CNY: '¥ CNY',
  JPY: '¥ JPY',
  RUB: '₽ RUB',
  EUR: '€ EUR',
};

export const defaultCurrencyForLocale: Record<Locale, CurrencyCode> = {
  en: 'USD',
  vi: 'VND',
  ko: 'KRW',
  zh: 'CNY',
  ja: 'JPY',
  ru: 'RUB',
};

// For now, only English is loaded. Others can be added as async imports.
const translations: Record<string, TranslationKeys> = { en };

export function t(path: string, locale: Locale = 'en'): string {
  const keys = path.split('.');
  let current: any = translations[locale] || translations.en;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      // Fallback to English
      current = translations.en;
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return path;
        }
      }
      return typeof current === 'string' ? current : path;
    }
  }
  return typeof current === 'string' ? current : path;
}
