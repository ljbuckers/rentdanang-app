"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AuthNav from "@/components/Auth/AuthNav";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import PriceRangeSlider from "./PriceRangeSlider";

export interface Filters {
  propertyTypes: string[];
  priceMin: number;
  priceMax: number;
  bedrooms: number | null;
  postedWithinHours: number | null;
  nearPOIs: string[];
  nearDistance: number;
  sortBy: string;
  areas: string[];
}

export const DEFAULT_FILTERS: Filters = {
  propertyTypes: [],
  priceMin: 0,
  priceMax: 100000000,
  bedrooms: null,
  postedWithinHours: null,
  nearPOIs: [],
  nearDistance: 1000,
  sortBy: "newest",
  areas: [],
};

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  totalCount: number;
  loading: boolean;
  onSaveSearch?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function QuickFilters({
  filters,
  onChange,
  totalCount,
  loading,
  onSaveSearch,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("filters");
  const tNav = useTranslations("nav");
  const tListing = useTranslations("listing");

  const BEDROOM_OPTIONS = [
    { label: t("bed", { count: 1 }), value: 1 },
    { label: t("bed", { count: 2 }), value: 2 },
    { label: t("bedPlus", { count: 3 }), value: 3 },
  ];

  const PROPERTY_TYPES = [
    { label: t("apartment"), value: "apartment" },
    { label: t("studio"), value: "studio" },
    { label: t("house"), value: "house" },
    { label: t("villa"), value: "villa" },
    { label: t("room"), value: "room" },
  ];

  const toggleBedroom = (value: number) => {
    onChange({ ...filters, bedrooms: filters.bedrooms === value ? null : value });
  };

  const togglePropertyType = (value: string) => {
    const next = filters.propertyTypes.includes(value)
      ? filters.propertyTypes.filter((t) => t !== value)
      : [...filters.propertyTypes, value];
    onChange({ ...filters, propertyTypes: next });
  };

  const handlePriceChange = useCallback(
    (min: number, max: number) => {
      onChange({ ...filters, priceMin: min, priceMax: max >= 50_000_000 ? 100_000_000 : max });
    },
    [filters, onChange]
  );

  const clearAll = () => {
    onChange({ ...DEFAULT_FILTERS, areas: filters.areas });
  };

  const hasFilters =
    filters.propertyTypes.length > 0 ||
    filters.bedrooms !== null ||
    filters.priceMin > 0 ||
    filters.priceMax < 100000000;

  const activeCount =
    (filters.propertyTypes.length > 0 ? 1 : 0) +
    (filters.bedrooms !== null ? 1 : 0) +
    (filters.priceMin > 0 || filters.priceMax < 100000000 ? 1 : 0);

  const pillBase = "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border";
  const pillActive = "bg-amber-500 text-white border-amber-500";
  const pillInactive = "bg-white/10 border-white/15 text-gray-300 hover:bg-white/20";
  const divider = <div className="w-px h-4 bg-white/20 mx-2 flex-shrink-0" />;

  // Display price for the slider (clamp to 50M for display)
  const sliderMin = Math.max(0, Math.min(filters.priceMin, 50_000_000));
  const sliderMax = filters.priceMax >= 100_000_000 ? 50_000_000 : Math.min(filters.priceMax, 50_000_000);

  return (
    <div className="bg-gray-900/85 backdrop-blur-md border-b border-white/10">
      {/* ── Desktop ── */}
      <div className="hidden md:block">
        {/* Row 1: Logo + filter pills */}
        <div className="flex items-center h-10 px-4 gap-2">
          <Link href="/" className="flex items-center gap-0.5 mr-1 flex-shrink-0">
            <span className="text-base font-bold text-amber-400">Rent</span>
            <span className="text-base font-bold text-white">DaNang</span>
          </Link>

          {divider}

          {BEDROOM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleBedroom(opt.value)}
              className={`${pillBase} ${filters.bedrooms === opt.value ? pillActive : pillInactive}`}
            >
              {opt.label}
            </button>
          ))}

          {divider}

          {PROPERTY_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => togglePropertyType(type.value)}
              className={`${pillBase} ${filters.propertyTypes.includes(type.value) ? pillActive : pillInactive}`}
            >
              {type.label}
            </button>
          ))}

          {divider}

          {/* Price range slider (inline) */}
          <div className="w-48 flex-shrink-0">
            <PriceRangeSlider
              min={sliderMin}
              max={sliderMax}
              onChange={handlePriceChange}
              anyPriceLabel={t("anyPrice")}
            />
          </div>

          {hasFilters && (
            <>
              {divider}
              <button
                onClick={clearAll}
                className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-colors"
              >
                {t("clear")}
              </button>
            </>
          )}
        </div>

        {/* Row 2: Utility — count, save, language, currency, auth */}
        <div className="flex items-center h-8 px-4 border-t border-white/5">
          <span className="text-xs text-gray-400 font-medium">
            {loading ? "..." : t("homes", { count: totalCount })}
          </span>

          {onSaveSearch && (
            <button
              onClick={onSaveSearch}
              className="flex text-xs font-medium text-amber-400 hover:text-amber-300 items-center gap-1 transition-colors ml-4"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {t("save")}
            </button>
          )}

          <div className="w-px h-3.5 bg-white/10 mx-3 flex-shrink-0" />

          <nav className="flex items-center gap-3">
            <Link href="/guide" className="text-xs text-gray-300 hover:text-white transition-colors">
              {tNav("livingInDaNang")}
            </Link>
            <Link href="/blog" className="text-xs text-gray-300 hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/dashboard" className="text-xs text-gray-300 hover:text-white transition-colors">
              {tNav("dashboard")}
            </Link>
          </nav>

          <div className="flex-1" />

          <LocaleSwitcher />
          <CurrencySwitcher />

          <div className="w-px h-3.5 bg-white/20 mx-2 flex-shrink-0" />

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen map"}
            >
              {isFullscreen ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4M9 15l-5 5m0 0v-4m0 4h4m6-6l5-5m0 0v4m0-4h-4" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
                </svg>
              )}
            </button>
          )}

          <AuthNav />
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="md:hidden">
        <div className="flex items-center h-11 px-4 gap-2">
          <Link href="/" className="flex items-center gap-0.5 flex-shrink-0">
            <span className="text-base font-bold text-amber-400">Rent</span>
            <span className="text-base font-bold text-white">DaNang</span>
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCount > 0
                ? "bg-amber-500 text-white"
                : "bg-white/10 border border-white/20 text-gray-300"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {t("filters")}{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>

          <div className="flex-1" />

          <LocaleSwitcher />
          <CurrencySwitcher />
          <AuthNav />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="bg-gray-800 px-4 py-5 space-y-5 border-t border-white/10">
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("bedrooms")}</h3>
              <div className="flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleBedroom(opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.bedrooms === opt.value
                        ? "bg-amber-500 text-white"
                        : "bg-white/10 text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("propertyType")}</h3>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => togglePropertyType(type.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.propertyTypes.includes(type.value)
                        ? "bg-amber-500 text-white"
                        : "bg-white/10 text-gray-300"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("priceRange")}</h3>
              <PriceRangeSlider
                min={sliderMin}
                max={sliderMax}
                onChange={handlePriceChange}
                anyPriceLabel={t("anyPrice")}
              />
            </div>

            {/* Language & Currency in drawer */}
            <div className="flex gap-4 pt-2 border-t border-white/10">
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{tNav("language")}</h3>
                <LocaleSwitcher />
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{tNav("currency")}</h3>
                <CurrencySwitcher />
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={() => { clearAll(); setMobileOpen(false); }}
                className="w-full bg-red-500/20 text-red-300 font-medium py-2.5 rounded-xl border border-red-500/30 transition-colors"
              >
                {t("clearAll")}
              </button>
            )}

            <button
              onClick={() => setMobileOpen(false)}
              className="w-full bg-white text-gray-900 font-bold py-3 rounded-xl active:scale-[0.98] transition-transform"
            >
              {t("showHomes", { count: totalCount })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
