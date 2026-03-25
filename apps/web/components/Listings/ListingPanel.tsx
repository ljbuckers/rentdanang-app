"use client";

import { useRef, useEffect } from "react";
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

interface ListingPanelProps {
  listings: Listing[];
  selectedId: string | null;
  highlightedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  loading: boolean;
  total: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
}

export default function ListingPanel({
  listings,
  selectedId,
  highlightedId,
  onHover,
  onSelect,
  loading,
  total,
  isCollapsed,
  onToggleCollapse,
  onLoadMore,
  hasMore = false,
  sortBy = "newest",
  onSortChange,
}: ListingPanelProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const t = useTranslations("listing");
  const locale = useLocale();
  const { format } = useCurrency();

  // Auto-scroll to highlighted card
  useEffect(() => {
    const id = highlightedId || selectedId;
    if (!id) return;
    const el = cardRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedId, selectedId]);

  return (
    <>
      {/* Collapse toggle tab */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-6 h-14 z-20",
          "bg-white/90 backdrop-blur-sm rounded-l-lg shadow-md",
          "border border-r-0 border-gray-200",
          "flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors",
          isCollapsed ? "right-0" : "right-[420px]"
        )}
      >
        <svg
          className={cn("w-3.5 h-3.5 transition-transform", isCollapsed && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Panel */}
      <aside
        role="region"
        aria-label="Rental listings"
        className={cn(
          "absolute top-0 right-0 bottom-0 z-10",
          "bg-white/85 backdrop-blur-lg border-l border-gray-200/50",
          "shadow-[-4px_0_24px_rgba(0,0,0,0.08)]",
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden" : "w-[420px]"
        )}
      >
        {/* Panel header */}
        <div className="h-10 px-4 flex items-center justify-between border-b border-gray-200/50 bg-white/60">
          <span className="text-sm font-medium text-gray-700">
            {loading ? t("loading") : t("totalListings", { total })}
          </span>
          {onSortChange && (
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
              aria-label="Sort listings"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          )}
        </div>

        {/* Scrollable grid */}
        <div className="h-[calc(100%-2.5rem)] overflow-y-auto overscroll-contain scrollbar-thin p-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-lg" />
                  <div className="mt-2 h-3 bg-gray-200 rounded w-3/4" />
                  <div className="mt-1 h-2 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm font-medium">{t("noListings")}</p>
              <p className="text-xs mt-1">{t("tryAdjusting")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[...listings].sort((a, b) => {
                if (a.id === selectedId) return -1;
                if (b.id === selectedId) return 1;
                return 0;
              }).map((listing) => {
                const displayTitle =
                  locale === "vi"
                    ? listing.title || listing.title_en || t("propertyIn", {
                        type: listing.property_type
                          ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)
                          : t("property"),
                        area: listing.area_name || t("daNang"),
                      })
                    : listing.title_en || listing.title || t("propertyIn", {
                        type: listing.property_type
                          ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)
                          : t("property"),
                        area: listing.area_name || t("daNang"),
                      });

                const priceDisplay = listing.price_vnd
                  ? format(listing.price_vnd)
                  : listing.price_usd
                    ? `$${Math.round(listing.price_usd).toLocaleString("en-US")}`
                    : t("contactForPrice");

                return (
                  <div
                    key={listing.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(listing.id, el);
                    }}
                  >
                    <Link
                      href={`/listings/${listing.id}`}
                      className={cn(
                        "group block rounded-lg overflow-hidden bg-white transition-all duration-200",
                        "border border-gray-100 shadow-sm hover:shadow-md",
                        listing.id === selectedId && "ring-2 ring-amber-500 shadow-lg shadow-amber-500/20 bg-amber-50",
                        listing.id === highlightedId && listing.id !== selectedId && "ring-2 ring-amber-400/50 shadow-md"
                      )}
                      onMouseEnter={() => onHover(listing.id)}
                      onMouseLeave={() => onHover(null)}
                    >
                      {/* Image */}
                      <div className="relative aspect-video bg-gray-100 overflow-hidden">
                        {listing.thumbnail_url ? (
                          <img
                            src={listing.thumbnail_url}
                            alt={displayTitle}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement?.classList.add("flex", "items-center", "justify-center");
                              const placeholder = document.createElement("div");
                              placeholder.className = "text-gray-300 text-xs";
                              placeholder.textContent = "Image unavailable";
                              target.parentElement?.appendChild(placeholder);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}

                        {/* Price overlay */}
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className="bg-black/70 text-white text-[11px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                            {priceDisplay}
                          </span>
                        </div>

                        {/* New badge */}
                        {isNew(listing.first_seen_at) && (
                          <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                            {t("new")}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 line-clamp-1">{displayTitle}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500">
                          <span>{listing.bedrooms === 0 ? t("studio") : t("bed", { count: listing.bedrooms ?? 1 })}</span>
                          {listing.area_sqm && (
                            <>
                              <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                              <span>{listing.area_sqm}m&sup2;</span>
                            </>
                          )}
                          <span className="ml-auto">{timeAgo(listing.first_seen_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          {/* Load More button */}
          {!loading && hasMore && onLoadMore && (
            <div className="py-3 flex justify-center">
              <button
                onClick={onLoadMore}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                Load more ({listings.length} of {total})
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
