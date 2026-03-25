"use client";

import { SessionProvider } from "next-auth/react";
import { CurrencyProvider } from "./CurrencyProvider";
import type { CurrencyCode } from "@/i18n/config";
import type { ExchangeRates } from "@/lib/exchange-rates";

interface ProvidersProps {
  children: React.ReactNode;
  exchangeRates?: ExchangeRates;
  initialCurrency?: CurrencyCode;
}

export default function Providers({
  children,
  exchangeRates,
  initialCurrency = "USD",
}: ProvidersProps) {
  if (exchangeRates) {
    return (
      <SessionProvider>
        <CurrencyProvider
          initialRates={exchangeRates}
          initialCurrency={initialCurrency}
        >
          {children}
        </CurrencyProvider>
      </SessionProvider>
    );
  }

  return <SessionProvider>{children}</SessionProvider>;
}
