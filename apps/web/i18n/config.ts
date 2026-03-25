export const locales = ['en', 'vi', 'ko', 'zh', 'ja', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
  ko: '한국어',
  zh: '中文',
  ja: '日本語',
  ru: 'Русский',
};

export type CurrencyCode = 'VND' | 'USD' | 'GBP' | 'KRW' | 'CNY' | 'JPY' | 'RUB' | 'EUR';

export const defaultCurrencyForLocale: Record<Locale, CurrencyCode> = {
  en: 'GBP',
  vi: 'VND',
  ko: 'KRW',
  zh: 'CNY',
  ja: 'JPY',
  ru: 'RUB',
};

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
