"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { timeAgo, isNew, getSourceLabel, cn } from "@/lib/utils";
import { useCurrency } from "@/components/CurrencyProvider";
import FavoriteButton from "./FavoriteButton";

interface ListingCardProps {
  listing: {
    id: string;
    title_en: string | null;
    title: string | null;
    description: string | null;
    description_en: string | null;
    thumbnail_url: string | null;
    price_vnd: number | null;
    price_usd: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqm: number | null;
    area_name: string | null;
    source_platform: string;
    property_type: string | null;
    created_at: string;
    first_seen_at: string;
    source_count?: number;
  };
  isActive?: boolean;
  isHighlighted?: boolean;
  onHover?: (id: string | null) => void;
  variant?: "grid" | "list";
}

export default function ListingCard({
  listing,
  isActive,
  isHighlighted,
  onHover,
  variant = "grid",
}: ListingCardProps) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const { format } = useCurrency();

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
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group relative block bg-white rounded-xl overflow-hidden transition-all duration-300 transform",
        "border border-gray-100 shadow-soft hover:shadow-card-hover hover:-translate-y-0.5",
        isActive && "ring-2 ring-primary shadow-soft-md",
        isHighlighted && !isActive && "ring-2 ring-primary/30 bg-gray-50",
        variant === "list" && "flex flex-row"
      )}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Image Container */}
      <div
        className={cn(
          "relative bg-gray-100 overflow-hidden",
          variant === "grid" ? "aspect-[16/9]" : "w-1/3 min-w-[120px] aspect-square"
        )}
      >
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={displayTitle}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.parentElement?.classList.add("flex", "items-center", "justify-center", "bg-gray-50");
              const placeholder = document.createElement("div");
              placeholder.className = "text-gray-300 text-xs";
              placeholder.textContent = "Image unavailable";
              target.parentElement?.appendChild(placeholder);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient Overlay (Grid only) */}
        {variant === "grid" && (
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
        )}

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isNew(listing.first_seen_at) && (
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider backdrop-blur-sm bg-opacity-90">
              {t("new")}
            </span>
          )}
          {listing.source_count && listing.source_count > 1 && (
            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider backdrop-blur-sm bg-opacity-90">
              {listing.source_count}x
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton listingId={listing.id} className="text-white drop-shadow-md hover:scale-110 transition-transform" />
        </div>

        {/* Price Overlay (Grid only) */}
        {variant === "grid" && (
          <div className="absolute bottom-3 left-3 text-white">
            <p className="text-base font-bold drop-shadow-md tracking-tight">
              {priceDisplay}
              <span className="text-xs font-normal opacity-90 ml-1">{t("perMonth")}</span>
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col justify-between", variant === "grid" ? "p-3" : "p-3 w-2/3")}>
        <div>
          {/* Price (List view only) */}
          {variant === "list" && (
            <p className="text-lg font-bold text-primary mb-1">
              {priceDisplay}
              <span className="text-xs font-normal text-gray-500 ml-1">{t("perMonth")}</span>
            </p>
          )}

          {/* Title */}
          <h3 className={cn(
            "font-medium text-gray-900 line-clamp-1 group-hover:text-primary transition-colors",
            variant === "grid" ? "text-sm mb-1" : "text-sm mb-1"
          )}>
            {displayTitle}
          </h3>

          {/* Location */}
          <div className="flex items-center text-gray-500 text-xs mb-3">
            <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{listing.area_name || t("daNangCity")}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-3 text-xs text-gray-600 font-medium">
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {listing.bedrooms === 0 ? t("studio") : t("bed", { count: listing.bedrooms ?? 1 })}
            </div>
            {listing.bathrooms !== null && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t("bath", { count: listing.bathrooms })}
              </div>
            )}
            {listing.area_sqm && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                {t("sqm", { size: listing.area_sqm })}
              </div>
            )}
          </div>
        </div>

        {/* Footer (Grid only) */}
        {variant === "grid" && (
          <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
              {getSourceLabel(listing.source_platform)}
            </span>
            <span className="text-[10px] text-gray-400">
              {timeAgo(listing.first_seen_at)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
