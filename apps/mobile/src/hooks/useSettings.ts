import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Locale, CurrencyCode, defaultCurrencyForLocale } from '../i18n';

const LOCALE_KEY = '@rentdanang_locale';
const CURRENCY_KEY = '@rentdanang_currency';

export function useSettings() {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedLocale, storedCurrency] = await Promise.all([
          AsyncStorage.getItem(LOCALE_KEY),
          AsyncStorage.getItem(CURRENCY_KEY),
        ]);
        if (storedLocale) setLocaleState(storedLocale as Locale);
        if (storedCurrency) setCurrencyState(storedCurrency as CurrencyCode);
      } catch {
        // use defaults
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    setCurrencyState(defaultCurrencyForLocale[l]);
    await AsyncStorage.setItem(LOCALE_KEY, l);
    await AsyncStorage.setItem(CURRENCY_KEY, defaultCurrencyForLocale[l]);
  }, []);

  const setCurrency = useCallback(async (c: CurrencyCode) => {
    setCurrencyState(c);
    await AsyncStorage.setItem(CURRENCY_KEY, c);
  }, []);

  return { locale, currency, setLocale, setCurrency, loaded };
}
