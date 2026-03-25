"use client";

import { getNearbyPOIs, formatDistance } from "@/lib/poi-data";
import { cn } from "@/lib/utils";

interface Props {
  latitude: number;
  longitude: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  beach: "🏖️",
  atm: "🏧",
  healthcare: "🏥",
  grocery: "🛒",
  coworking: "💻",
  gym: "🏋️",
  motorbike: "🏍️",
};

export default function NeighborhoodSummary({ latitude, longitude }: Props) {
  const categories = getNearbyPOIs(latitude, longitude);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Neighborhood
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(({ category, label, color, pois }) => {
          const top = pois.slice(0, 2);
          if (top.length === 0) return null;

          return (
            <div
              key={category}
              className="bg-white rounded-xl p-4 border border-gray-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{CATEGORY_ICONS[category]}</span>
                <span className="font-medium text-gray-900 text-sm">
                  {label}
                </span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
              </div>

              <div className="space-y-2">
                {top.map(({ poi, distanceM }) => {
                  const walkable = distanceM <= 500;
                  const dist = formatDistance(distanceM);

                  return (
                    <div key={poi.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 truncate">
                          {poi.name}
                        </span>
                        <span
                          className={cn(
                            "flex-shrink-0 font-medium",
                            walkable ? "text-green-600" : "text-gray-500"
                          )}
                        >
                          {dist}
                        </span>
                        {walkable && (
                          <span className="flex-shrink-0 text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">
                            walkable
                          </span>
                        )}
                      </div>

                      {/* ATM meta: fee + limit */}
                      {category === "atm" && poi.meta.fee && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Fee: {poi.meta.fee}
                          {poi.meta.limit && ` · Limit: ${poi.meta.limit}`}
                        </p>
                      )}

                      {/* Coworking meta: price */}
                      {category === "coworking" && poi.meta.price && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {poi.meta.price}
                        </p>
                      )}

                      {/* Gym meta: price */}
                      {category === "gym" && poi.meta.price && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {poi.meta.price}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
