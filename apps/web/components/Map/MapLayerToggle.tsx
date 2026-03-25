"use client";

import { useState } from "react";
import { POI_LAYERS } from "@/lib/poi-data";

interface MapLayerToggleProps {
  activeLayers: Set<string>;
  onToggleLayer: (id: string) => void;
  listingCount?: number;
}

export default function MapLayerToggle({
  activeLayers,
  onToggleLayer,
  listingCount,
}: MapLayerToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSubcats, setExpandedSubcats] = useState<Set<string>>(
    new Set()
  );

  const activeCount = activeLayers.size;

  const toggleSubcat = (layerId: string) => {
    setExpandedSubcats((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const clearAll = () => {
    activeLayers.forEach((id) => onToggleLayer(id));
  };

  // ── Collapsed button ───────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-white rounded-lg shadow-md hover:shadow-lg
            px-3 py-2 text-sm font-medium text-gray-700 transition-shadow duration-200
            border border-gray-100"
        >
          {/* Layers icon - stack of squares */}
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 2L2 7l10 5 10-5-10-5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2 17l10 5 10-5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2 12l10 5 10-5"
            />
          </svg>
          <span>Layers</span>
          {activeCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-white text-xs font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────────────
  return (
    <div className="absolute top-4 left-4 z-20">
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-100
          max-w-[280px] max-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Map Layers</h3>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Layer list */}
        <div className="overflow-y-auto scrollbar-thin flex-1 py-1">
          {POI_LAYERS.map((layer) => {
            const isActive = activeLayers.has(layer.id);
            const hasSubcats = layer.subcategories && layer.subcategories.length > 0;
            const isExpanded = expandedSubcats.has(layer.id);

            return (
              <div key={layer.id}>
                {/* Main layer row */}
                <div
                  className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onToggleLayer(layer.id)}
                >
                  {/* Checkbox dot */}
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors"
                    style={{
                      borderColor: isActive ? layer.color : "#D1D5DB",
                      backgroundColor: isActive ? layer.color : "transparent",
                    }}
                  />
                  {/* Icon */}
                  <span className="text-sm flex-shrink-0" aria-hidden>
                    {layer.icon === "banknote" && "💵"}
                    {layer.icon === "waves" && "🌊"}
                    {layer.icon === "heart-pulse" && "🏥"}
                    {layer.icon === "shopping-cart" && "🛒"}
                    {layer.icon === "laptop" && "💻"}
                    {layer.icon === "dumbbell" && "🏋️"}
                    {layer.icon === "bike" && "🏍️"}
                    {layer.icon === "utensils" && "🍽️"}
                    {layer.icon === "map-pin" && "📍"}
                  </span>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700 block leading-tight">
                      {layer.label}
                    </span>
                    <span className="text-xs text-gray-400 block leading-tight">
                      {layer.description}
                    </span>
                  </div>
                  {/* Expand chevron */}
                  {hasSubcats && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubcat(layer.id);
                      }}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-0.5 transition-colors"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Subcategory rows */}
                {hasSubcats && isExpanded && (
                  <div className="pb-1">
                    {layer.subcategories!.map((sub) => {
                      const subId = `${layer.id}:${sub.id}`;
                      const subActive = activeLayers.has(subId);
                      return (
                        <div
                          key={subId}
                          className="flex items-center gap-2 pl-10 pr-4 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => onToggleLayer(subId)}
                        >
                          <span
                            className="flex-shrink-0 w-3 h-3 rounded-full border-2 transition-colors"
                            style={{
                              borderColor: subActive ? layer.color : "#D1D5DB",
                              backgroundColor: subActive ? layer.color : "transparent",
                            }}
                          />
                          <span className="text-xs text-gray-600">{sub.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 text-center">
            Toggle layers to explore Da Nang
          </p>
        </div>
      </div>
    </div>
  );
}
