import type { CurrencyCode } from '@/i18n/config';

export interface ExchangeRates {
  /** How many VND per 1 unit of foreign currency */
  VND_USD: number;
  VND_GBP: number;
  VND_EUR: number;
  VND_KRW: number;
  VND_CNY: number;
  VND_JPY: number;
  VND_RUB: number;
  updatedAt: string;
}

const FALLBACK_RATES: ExchangeRates = {
  VND_USD: 25500,
  VND_GBP: 32300,
  VND_EUR: 27500,
  VND_KRW: 18,
  VND_CNY: 3500,
  VND_JPY: 170,
  VND_RUB: 270,
  updatedAt: new Date().toISOString(),
};

let cachedRates: ExchangeRates | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 3600_000; // 1 hour
const RETRY_TTL = 300_000;  // 5 min after failure
const FETCH_TIMEOUT = 3000; // 3 seconds max

export async function getExchangeRates(): Promise<ExchangeRates> {
  if (cachedRates && Date.now() < cacheExpiry) {
    return cachedRates;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { signal: controller.signal, next: { revalidate: 3600 } }
    );
    clearTimeout(timeout);

    const data = await res.json();

    if (data.result !== 'success' || !data.rates?.VND) {
      if (cachedRates) {
        cacheExpiry = Date.now() + RETRY_TTL;
        return cachedRates;
      }
      return FALLBACK_RATES;
    }

    const usdToVnd = data.rates.VND;

    cachedRates = {
      VND_USD: Math.round(usdToVnd),
      VND_GBP: data.rates.GBP ? Math.round(usdToVnd / data.rates.GBP) : FALLBACK_RATES.VND_GBP,
      VND_EUR: data.rates.EUR ? Math.round(usdToVnd / data.rates.EUR) : FALLBACK_RATES.VND_EUR,
      VND_KRW: data.rates.KRW ? Math.round((usdToVnd / data.rates.KRW) * 100) / 100 : FALLBACK_RATES.VND_KRW,
      VND_CNY: data.rates.CNY ? Math.round(usdToVnd / data.rates.CNY) : FALLBACK_RATES.VND_CNY,
      VND_JPY: data.rates.JPY ? Math.round((usdToVnd / data.rates.JPY) * 100) / 100 : FALLBACK_RATES.VND_JPY,
      VND_RUB: data.rates.RUB ? Math.round((usdToVnd / data.rates.RUB) * 100) / 100 : FALLBACK_RATES.VND_RUB,
      updatedAt: new Date().toISOString(),
    };
    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedRates;
  } catch {
    // Timeout, network error, abort: fall back gracefully
    if (cachedRates) {
      cacheExpiry = Date.now() + RETRY_TTL;
      return cachedRates;
    }
    return FALLBACK_RATES;
  }
}

export function convertFromVND(
  amountVnd: number,
  targetCurrency: CurrencyCode,
  rates: ExchangeRates
): number {
  if (targetCurrency === 'VND') return amountVnd;
  const rateKey = `VND_${targetCurrency}` as keyof ExchangeRates;
  const rate = rates[rateKey] as number;
  if (!rate) return amountVnd;
  return Math.round(amountVnd / rate);
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  VND: '₫',
  USD: '$',
  GBP: '£',
  EUR: '€',
  KRW: '₩',
  CNY: '¥',
  JPY: '¥',
  RUB: '₽',
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  VND: 'vi-VN',
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'fr-FR',
  KRW: 'ko-KR',
  CNY: 'zh-CN',
  JPY: 'ja-JP',
  RUB: 'ru-RU',
};

export function formatCurrencyAmount(amount: number, currency: CurrencyCode): string {
  if (currency === 'VND') {
    if (amount >= 1_000_000) {
      const millions = amount / 1_000_000;
      return `₫${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)} triệu`;
    }
    return `₫${amount.toLocaleString('vi-VN')}`;
  }

  const locale = CURRENCY_LOCALES[currency];
  const noDecimals: CurrencyCode[] = ['KRW', 'JPY'];
  const fractionDigits = noDecimals.includes(currency) ? 0 : 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
