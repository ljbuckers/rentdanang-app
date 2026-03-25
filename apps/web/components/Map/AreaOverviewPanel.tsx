"use client";

import { Link } from "@/i18n/navigation";
import { AreaGuide } from "@/lib/area-guides-data";

interface AreaOverviewPanelProps {
  area: AreaGuide;
  onShowListings: () => void;
  onClose: () => void;
}

const RATING_LABELS: { key: keyof AreaGuide["ratings"]; label: string }[] = [
  { key: "walkability", label: "Walkability" },
  { key: "nightlife", label: "Nightlife" },
  { key: "englishFriendly", label: "English" },
  { key: "beachAccess", label: "Beach" },
  { key: "localFood", label: "Local Food" },
];

function RatingDots({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= value ? "bg-primary" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function AreaOverviewPanel({
  area,
  onShowListings,
  onClose,
}: AreaOverviewPanelProps) {
  return (
    <div className="absolute left-4 top-4 bottom-4 w-[300px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col z-30 animate-slide-in-left overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{area.name}</h2>
            <p className="text-sm text-primary font-medium">{area.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 italic">{area.vibe}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {/* Best for chips */}
        <div className="flex flex-wrap gap-1.5">
          {area.bestFor.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Pros & Cons */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">
              Pros
            </h3>
            <ul className="space-y-1">
              {area.pros.slice(0, 3).map((pro) => (
                <li key={pro} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-green-500 shrink-0">+</span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">
              Cons
            </h3>
            <ul className="space-y-1">
              {area.cons.slice(0, 3).map((con) => (
                <li key={con} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-red-400 shrink-0">-</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rent ranges */}
        <div>
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1.5">
            Rent Ranges
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase">Studio</p>
              <p className="text-xs font-bold text-gray-900">{area.rentRanges.studio}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase">1 BR</p>
              <p className="text-xs font-bold text-gray-900">{area.rentRanges.oneBr}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase">2 BR</p>
              <p className="text-xs font-bold text-gray-900">{area.rentRanges.twoBr}</p>
            </div>
          </div>
        </div>

        {/* Ratings */}
        <div>
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1.5">
            Area Ratings
          </h3>
          <div className="space-y-1.5">
            {RATING_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{label}</span>
                <RatingDots value={area.ratings[key]} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4 pt-3 border-t border-gray-100 space-y-2">
        <button
          onClick={onShowListings}
          className="w-full py-2 px-4 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Show listings
        </button>
        <Link
          href={`/areas/${area.slug}`}
          className="block w-full py-2 px-4 text-center text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
        >
          Full guide &rarr;
        </Link>
      </div>
    </div>
  );
}
