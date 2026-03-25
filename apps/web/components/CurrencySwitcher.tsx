"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "./CurrencyProvider";
import { currencyLabels, type CurrencyCode } from "@/i18n/config";

const CURRENCIES: CurrencyCode[] = ["GBP", "USD", "EUR", "VND", "KRW", "CNY", "JPY", "RUB"];

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  VND: "₫",
  USD: "$",
  GBP: "£",
  KRW: "₩",
  CNY: "¥",
  JPY: "¥",
  RUB: "₽",
  EUR: "€",
};

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Change currency"
      >
        <span className="text-sm font-bold leading-none">{CURRENCY_SYMBOLS[currency]}</span>
        <span>{currency}</span>
        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {CURRENCIES.map((code) => (
            <button
              key={code}
              onClick={() => { setCurrency(code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                code === currency
                  ? "bg-amber-50 text-amber-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="w-4 text-center font-medium">{CURRENCY_SYMBOLS[code]}</span>
              {currencyLabels[code]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
