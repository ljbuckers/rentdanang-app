"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CurrencyCode } from "@/i18n/config";
import type { ExchangeRates } from "@/lib/exchange-rates";
import {
  convertFromVND,
  formatCurrencyAmount,
} from "@/lib/exchange-rates";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  rates: ExchangeRates;
  convert: (amountVnd: number) => number;
  format: (amountVnd: number) => string;
  formatDirect: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({
  children,
  initialRates,
  initialCurrency = "USD",
}: {
  children: ReactNode;
  initialRates: ExchangeRates;
  initialCurrency?: CurrencyCode;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    document.cookie = `currency=${code};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  const convert = useCallback(
    (amountVnd: number) => convertFromVND(amountVnd, currency, initialRates),
    [currency, initialRates]
  );

  const format = useCallback(
    (amountVnd: number) => {
      const converted = convertFromVND(amountVnd, currency, initialRates);
      return formatCurrencyAmount(converted, currency);
    },
    [currency, initialRates]
  );

  const formatDirect = useCallback(
    (amount: number) => formatCurrencyAmount(amount, currency),
    [currency]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, rates: initialRates, convert, format, formatDirect }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
