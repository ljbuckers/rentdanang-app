"use client";

import { useCallback, useRef } from "react";
import { useCurrency } from "@/components/CurrencyProvider";

const MIN = 0;
const MAX = 50_000_000;
const STEP = 1_000_000;

// Tick mark VND values for the slider axis
const TICKS = [0, 10_000_000, 20_000_000, 30_000_000, 40_000_000, 50_000_000];

/** Compact label: e.g. "$200", "£1.5k", "₩550k", "₫10M" */
function compactLabel(vndAmount: number, convert: (vnd: number) => number, symbol: string, currency: string): string {
  if (vndAmount === 0) return `${symbol}0`;
  const val = convert(vndAmount);
  if (currency === "VND") {
    return `${(vndAmount / 1_000_000).toFixed(0)}M`;
  }
  if (currency === "KRW" || currency === "JPY") {
    if (val >= 1_000_000) return `${symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${symbol}${Math.round(val / 1_000)}k`;
    return `${symbol}${val}`;
  }
  if (val >= 10_000) return `${symbol}${(val / 1_000).toFixed(0)}k`;
  if (val >= 1_000) return `${symbol}${(val / 1_000).toFixed(1)}k`;
  return `${symbol}${val}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  VND: "₫", USD: "$", GBP: "£", EUR: "€", KRW: "₩", CNY: "¥", JPY: "¥", RUB: "₽",
};

interface PriceRangeSliderProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
  anyPriceLabel?: string;
  className?: string;
}

export default function PriceRangeSlider({
  min,
  max,
  onChange,
  anyPriceLabel = "Any price",
  className = "",
}: PriceRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"min" | "max" | null>(null);
  const { currency, convert } = useCurrency();
  const sym = CURRENCY_SYMBOLS[currency] || "$";

  const label = useCallback(
    (vnd: number) => compactLabel(vnd, convert, sym, currency),
    [convert, sym, currency]
  );

  const clampedMin = Math.max(MIN, Math.min(min, MAX));
  const clampedMax = Math.max(MIN, Math.min(max, MAX));

  const toPercent = (val: number) => ((val - MIN) / (MAX - MIN)) * 100;

  const valFromX = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = MIN + pct * (MAX - MIN);
    return Math.round(raw / STEP) * STEP;
  }, []);

  const handlePointerDown = useCallback(
    (handle: "min" | "max") => (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = handle;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const val = valFromX(e.clientX);
      if (dragging.current === "min") {
        onChange(Math.min(val, clampedMax - STEP), clampedMax);
      } else {
        onChange(clampedMin, Math.max(val, clampedMin + STEP));
      }
    },
    [valFromX, onChange, clampedMin, clampedMax]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const leftPct = toPercent(clampedMin);
  const rightPct = toPercent(clampedMax);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const val = valFromX(e.clientX);
      const distToMin = Math.abs(val - clampedMin);
      const distToMax = Math.abs(val - clampedMax);
      if (distToMin <= distToMax) {
        onChange(Math.min(val, clampedMax - STEP), clampedMax);
      } else {
        onChange(clampedMin, Math.max(val, clampedMin + STEP));
      }
    },
    [valFromX, onChange, clampedMin, clampedMax]
  );

  const isDefault = clampedMin === MIN && clampedMax >= MAX;

  const maxLabel = clampedMax >= MAX ? `${label(MAX)}+` : label(clampedMax);

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-300">
          {isDefault ? anyPriceLabel : `${label(clampedMin)} – ${maxLabel}`}
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-5 flex items-center cursor-pointer"
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/15" />
        <div
          className="absolute h-1 rounded-full bg-amber-500"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-amber-500 shadow-md cursor-grab active:cursor-grabbing z-10 -translate-x-1/2"
          style={{ left: `${leftPct}%` }}
          onPointerDown={handlePointerDown("min")}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-amber-500 shadow-md cursor-grab active:cursor-grabbing z-10 -translate-x-1/2"
          style={{ left: `${rightPct}%` }}
          onPointerDown={handlePointerDown("max")}
        />
      </div>

      {/* Tick labels in selected currency */}
      <div className="flex justify-between mt-0.5 text-[9px] text-gray-500">
        {TICKS.map((vnd, i) => (
          <span key={i}>
            {i === TICKS.length - 1 ? `${label(vnd)}+` : label(vnd)}
          </span>
        ))}
      </div>
    </div>
  );
}
