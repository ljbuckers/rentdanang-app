"use client";

import { useTranslations } from "next-intl";

const LEGEND_COLORS = [
  { color: "#3B82F6", bg: "#DBEAFE", key: "apartment" as const },
  { color: "#EAB308", bg: "#FEF9C3", key: "house" as const },
  { color: "#22C55E", bg: "#DCFCE7", key: "villa" as const },
];

export default function MapLegend() {
  const t = useTranslations("filters");
  const tListing = useTranslations("listing");

  return (
    <div className="absolute bottom-6 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 px-3 py-2 z-10">
      <div className="flex items-center gap-3 text-xs">
        {LEGEND_COLORS.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border-[1.5px] inline-block"
              style={{ backgroundColor: item.bg, borderColor: item.color }}
            />
            <span className="text-gray-600">{t(item.key)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
          <span
            className="w-3.5 h-3.5 rounded-full border-2 inline-block"
            style={{ borderColor: "#f59e0b", backgroundColor: "#fef3c7" }}
          />
          <span className="text-gray-600">{tListing("new")}</span>
        </div>
      </div>
    </div>
  );
}
