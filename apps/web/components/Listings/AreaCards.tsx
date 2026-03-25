"use client";

import { useTranslations } from "next-intl";
import { AREA_BOUNDARIES } from "@/lib/area-boundaries";
import { getAreaGuideByMapSlug } from "@/lib/area-guides-data";
import { cn } from "@/lib/utils";

interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  price_vnd: number | null;
  property_type: string | null;
  area_name: string | null;
}

interface AreaCardsProps {
  selectedAreaSlug: string | null;
  onSelectArea: (slug: string | null) => void;
  mapPins: MapPin[];
}

const AREA_IMAGES: Record<string, string> = {
  "an-thuong": "/images/vietnam/area-an-thuong.jpg",
  "son-tra": "/images/vietnam/area-son-tra.jpg",
  "hai-chau": "/images/vietnam/area-hai-chau.jpg",
  "ngu-hanh-son": "/images/vietnam/area-ngu-hanh-son.jpg",
  "lien-chieu": "/images/vietnam/area-lien-chieu.jpg",
};

function countPinsByArea(pins: MapPin[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const area of AREA_BOUNDARIES) {
    counts[area.slug] = 0;
  }
  for (const pin of pins) {
    if (!pin.area_name) continue;
    const boundary = AREA_BOUNDARIES.find((a) => a.name === pin.area_name);
    if (boundary) {
      counts[boundary.slug] = (counts[boundary.slug] || 0) + 1;
    }
  }
  return counts;
}

export default function AreaCards({
  selectedAreaSlug,
  onSelectArea,
  mapPins,
}: AreaCardsProps) {
  const counts = countPinsByArea(mapPins);
  const totalCount = mapPins.length;
  const t = useTranslations("areas");

  return (
    <div className="bg-gray-900/70 backdrop-blur-md px-3 py-2 border-b border-white/10 relative">
      {/* Scroll fade hint on mobile */}
      <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-gray-900/70 to-transparent md:hidden z-10" />
      <div className="grid grid-cols-6 gap-2 max-md:flex max-md:overflow-x-auto max-md:snap-x max-md:gap-2 max-md:pb-1 scrollbar-thin">
        {/* All Areas card */}
        <button
          onClick={() => onSelectArea(null)}
          className={cn(
            "group relative rounded-lg overflow-hidden text-left transition-all max-md:min-w-[140px] max-md:snap-start max-md:flex-shrink-0 h-[72px]",
            selectedAreaSlug === null
              ? "ring-2 ring-amber-400 shadow-md"
              : "hover:shadow-md"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-800" />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
          <div className="relative h-full flex flex-col justify-between p-2.5">
            <div>
              <div className="font-semibold text-xs text-white drop-shadow-sm">{t("allAreas")}</div>
              <div className="text-[10px] text-white/70">{t("browseEverything")}</div>
            </div>
            <span className="text-[10px] font-medium text-white/90 bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm self-start">
              {t("listings", { count: totalCount })}
            </span>
          </div>
        </button>

        {/* Area cards */}
        {AREA_BOUNDARIES.map((area) => {
          const guide = getAreaGuideByMapSlug(area.slug);
          const count = counts[area.slug] || 0;
          const isActive = selectedAreaSlug === area.slug;
          const imgSrc = AREA_IMAGES[area.slug];

          return (
            <button
              key={area.slug}
              onClick={() => onSelectArea(isActive ? null : area.slug)}
              className={cn(
                "group relative rounded-lg overflow-hidden text-left transition-all max-md:min-w-[140px] max-md:snap-start max-md:flex-shrink-0 h-[72px]",
                isActive ? "ring-2 shadow-md" : "hover:shadow-md"
              )}
              style={isActive ? { boxShadow: `0 0 0 2px ${area.color}` } : undefined}
            >
              {imgSrc && (
                <img src={imgSrc} alt={area.name} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div
                className="absolute inset-0 transition-opacity"
                style={{
                  background: `linear-gradient(to top, ${area.color}DD 0%, ${area.color}88 40%, ${area.color}33 100%)`,
                }}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              <div className="relative h-full flex flex-col justify-between p-2.5">
                <div>
                  <div className="font-semibold text-xs text-white drop-shadow-sm">
                    {area.name.split(" (")[0].split(" / ")[0]}
                  </div>
                  <div className="text-[10px] text-white/80 drop-shadow-sm">
                    {guide?.tagline || ""}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-white/90 bg-black/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    {t("listings", { count })}
                  </span>
                  {guide?.rentRanges.oneBr && (
                    <span className="text-[9px] text-white/70">
                      {t("oneBrFrom", { range: guide.rentRanges.oneBr })}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
