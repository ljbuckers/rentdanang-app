import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from './useSettings';
import { useFavorites } from './useFavorites';
import { ExchangeRates, FALLBACK_RATES, fetchExchangeRates } from '../utils/currency';
import { Locale, CurrencyCode } from '../i18n';
import { Listing } from '../services/api';

interface AppContextType {
  locale: Locale;
  currency: CurrencyCode;
  rates: ExchangeRates;
  setLocale: (l: Locale) => void;
  setCurrency: (c: CurrencyCode) => void;
  favorites: Listing[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (listing: Listing) => void;
  clearFavorites: () => void;
  ready: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const favs = useFavorites();
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);

  useEffect(() => {
    fetchExchangeRates().then(setRates);
  }, []);

  const ready = settings.loaded && favs.loaded;

  return (
    <AppContext.Provider
      value={{
        locale: settings.locale,
        currency: settings.currency,
        rates,
        setLocale: settings.setLocale,
        setCurrency: settings.setCurrency,
        favorites: favs.favorites,
        isFavorite: favs.isFavorite,
        toggleFavorite: favs.toggleFavorite,
        clearFavorites: favs.clearAll,
        ready,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
