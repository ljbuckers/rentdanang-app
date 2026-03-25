"use client";

import { useEffect, useRef } from "react";
import ListingCard from "./ListingCard";

interface Listing {
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
}

interface ListingGridProps {
  listings: Listing[];
  selectedId?: string | null;
  highlightedId?: string | null;
  onHover?: (id: string | null) => void;
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/10] skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-6 w-32 skeleton" />
        <div className="h-4 w-48 skeleton" />
        <div className="h-4 w-40 skeleton" />
        <div className="h-3 w-20 skeleton mt-1" />
      </div>
    </div>
  );
}

export default function ListingGrid({
  listings,
  selectedId,
  highlightedId,
  onHover,
  loading,
}: ListingGridProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to highlighted listing (from map marker hover)
  useEffect(() => {
    const targetId = highlightedId || selectedId;
    if (!targetId) return;
    const el = cardRefs.current.get(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedId, selectedId]);
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <svg
          className="w-16 h-16 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-700">No listings found</h3>
        <p className="text-sm text-gray-500 mt-1">
          Try adjusting your filters or expanding your search area.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
      {listings.map((listing) => (
        <div
          key={listing.id}
          ref={(el) => {
            if (el) cardRefs.current.set(listing.id, el);
            else cardRefs.current.delete(listing.id);
          }}
        >
          <ListingCard
            listing={listing}
            isActive={listing.id === selectedId}
            isHighlighted={listing.id === highlightedId}
            onHover={onHover}
          />
        </div>
      ))}
    </div>
  );
}
