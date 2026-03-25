"use client";

import { useRef, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn, timeAgo, isNew } from "@/lib/utils";
import { useCurrency } from "@/components/CurrencyProvider";

interface Listing {
  id: string;
  title: string | null;
  title_en: string | null;
  thumbnail_url: string | null;
  price_vnd: number | null;
  price_usd: number | null;
  bedrooms: number | null;
  area_sqm: number | null;
  area_name: string | null;
  property_type: string | null;
  first_seen_at: string;
}

interface MobileBottomSheetProps {
  listings: Listing[];
  selectedId: string | null;
  highlightedId: string | null;
  onHover: (id: string | null) => void;
  loading: boolean;
  total: number;
}

type SnapState = "peek" | "half" | "full";

const PEEK_HEIGHT = 120;
const HALF_RATIO = 0.45;
const FULL_RATIO = 0.85;

export default function MobileBottomSheet({
  listings,
  selectedId,
  highlightedId,
  onHover,
  loading,
  total,
}: MobileBottomSheetProps) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const { format } = useCurrency();
  const [snapState, setSnapState] = useState<SnapState>("peek");
  const startY = useRef(0);
  const startHeight = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const getSnapHeight = useCallback((state: SnapState) => {
    if (typeof window === "undefined") return PEEK_HEIGHT;
    switch (state) {
      case "peek": return PEEK_HEIGHT;
      case "half": return Math.round(window.innerHeight * HALF_RATIO);
      case "full": return Math.round(window.innerHeight * FULL_RATIO);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startHeight.current = getSnapHeight(snapState);
    isDragging.current = true;
  }, [snapState, getSnapHeight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const delta = startY.current - e.touches[0].clientY;
    const newHeight = Math.max(80, Math.min(window.innerHeight * 0.9, startHeight.current + delta));
    sheetRef.current.style.height = `${newHeight}px`;
    sheetRef.current.style.transition = "none";
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;
    isDragging.current = false;
    const currentHeight = sheetRef.current.getBoundingClientRect().height;
    const peekH = PEEK_HEIGHT;
    const halfH = window.innerHeight * HALF_RATIO;
    const fullH = window.innerHeight * FULL_RATIO;

    // Snap to nearest
    const distances = [
      { state: "peek" as SnapState, dist: Math.abs(currentHeight - peekH) },
      { state: "half" as SnapState, dist: Math.abs(currentHeight - halfH) },
      { state: "full" as SnapState, dist: Math.abs(currentHeight - fullH) },
    ];
    distances.sort((a, b) => a.dist - b.dist);
    const target = distances[0].state;

    sheetRef.current.style.transition = "height 0.3s ease-out";
    sheetRef.current.style.height = `${getSnapHeight(target)}px`;
    setSnapState(target);
  }, [getSnapHeight]);

  return (
    <div
      ref={sheetRef}
      className="absolute bottom-0 inset-x-0 z-10 bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
      style={{
        height: getSnapHeight(snapState),
        transition: "height 0.3s ease-out",
      }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Header */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">
          {loading ? t("loading") : total > 0 ? t("totalListings", { total }) : listings.length === 0 ? "Zoom in to see listings" : t("totalListings", { total })}
        </span>
        {snapState !== "peek" && (
          <button
            onClick={() => {
              setSnapState("peek");
              if (sheetRef.current) {
                sheetRef.current.style.transition = "height 0.3s ease-out";
                sheetRef.current.style.height = `${PEEK_HEIGHT}px`;
              }
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {t("minimize")}
          </button>
        )}
      </div>

      {/* Listing content */}
      <div
        className={cn(
          "px-4 overscroll-contain",
          snapState === "peek" ? "overflow-hidden" : "overflow-y-auto"
        )}
        style={{ height: `calc(100% - 64px)` }}
      >
        <div className="space-y-3 pb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-24 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="mt-2 h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : (
            listings.map((listing) => {
              const displayTitle =
                locale === "vi"
                  ? listing.title || listing.title_en || t("propertyIn", {
                      type: listing.property_type ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1) : t("property"),
                      area: listing.area_name || t("daNang"),
                    })
                  : listing.title_en || listing.title || t("propertyIn", {
                      type: listing.property_type ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1) : t("property"),
                      area: listing.area_name || t("daNang"),
                    });

              const priceDisplay = listing.price_vnd
                ? format(listing.price_vnd)
                : listing.price_usd
                  ? `$${Math.round(listing.price_usd).toLocaleString("en-US")}`
                  : t("contactForPrice");

              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className={cn(
                    "flex gap-3 p-2 rounded-lg transition-colors",
                    "hover:bg-gray-50",
                    listing.id === selectedId && "bg-primary/5 ring-1 ring-primary/20",
                    listing.id === highlightedId && listing.id !== selectedId && "bg-gray-50"
                  )}
                  onMouseEnter={() => onHover(listing.id)}
                  onMouseLeave={() => onHover(null)}
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {listing.thumbnail_url ? (
                      <img
                        src={listing.thumbnail_url}
                        alt={displayTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {priceDisplay}
                      <span className="text-xs font-normal text-gray-500 ml-1">{t("perMonth")}</span>
                    </p>
                    <p className="text-xs text-gray-700 line-clamp-1 mt-0.5">{displayTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                      <span>{listing.bedrooms === 0 ? t("studio") : t("bed", { count: listing.bedrooms ?? 1 })}</span>
                      {listing.area_sqm && <span>{listing.area_sqm}m&sup2;</span>}
                      <span>{timeAgo(listing.first_seen_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
