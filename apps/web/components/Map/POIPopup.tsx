import type { POI } from "@/lib/poi-data";
import { POI_LAYERS } from "@/lib/poi-data";

interface POIPopupProps {
  poi: POI;
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  recommended: { bg: "#FEF3C7", text: "#92400E" },
  "free-atm": { bg: "#D1FAE5", text: "#065F46" },
  avoid: { bg: "#FEE2E2", text: "#991B1B" },
  "english-spoken": { bg: "#DBEAFE", text: "#1E40AF" },
};

const DEFAULT_TAG_COLOR = { bg: "#F3F4F6", text: "#4B5563" };

export default function POIPopup({ poi }: POIPopupProps) {
  const layer = POI_LAYERS.find((l) => l.id === poi.category);
  const layerColor = layer?.color ?? "#6B7280";

  const metaEntries = Object.entries(poi.meta);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;

  return (
    <div style={{ maxWidth: 260, minWidth: 200 }}>
      {/* Color bar */}
      <div
        style={{ height: 4, backgroundColor: layerColor }}
        className="w-full rounded-t-xl"
      />

      <div className="px-3 py-2.5">
        {/* Name & address */}
        <h4 className="text-sm font-semibold text-gray-800 leading-tight">
          {poi.name}
        </h4>
        {poi.address && (
          <p className="text-xs text-gray-400 mt-0.5 leading-tight">
            {poi.address}
          </p>
        )}

        {/* Description */}
        {poi.description && (
          <p className="text-sm text-gray-600 mt-1.5 leading-snug">
            {poi.description}
          </p>
        )}

        {/* Meta info */}
        {metaEntries.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {metaEntries.map(([key, value]) => (
              <div key={key} className="flex items-start gap-1.5 text-xs">
                <span className="text-gray-400 capitalize font-medium min-w-[40px]">
                  {key}:
                </span>
                <span
                  className="font-medium"
                  style={{
                    color:
                      poi.category === "atm" && value === "FREE"
                        ? "#059669"
                        : poi.category === "atm" &&
                          key === "fee" &&
                          value !== "FREE"
                        ? "#DC2626"
                        : "#374151",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {poi.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {poi.tags.map((tag) => {
              const colors = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
              return (
                <span
                  key={tag}
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Hours */}
        {poi.hours && (
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Hours:</span> {poi.hours}
          </p>
        )}

        {/* Action links */}
        <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-gray-100">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
          >
            Directions
          </a>
          {poi.url && (
            <a
              href={poi.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
            >
              Website
            </a>
          )}
          {poi.phone && (
            <a
              href={`tel:${poi.phone}`}
              className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
            >
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
