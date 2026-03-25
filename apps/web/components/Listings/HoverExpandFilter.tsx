"use client";

import { cn } from "@/lib/utils";

interface FilterOption {
  label: string;
  value: string | number | null;
}

interface HoverExpandFilterProps {
  label: string;
  activeLabel: string | null;
  options: FilterOption[];
  selectedValues: (string | number | null)[];
  onToggle: (value: string | number | null) => void;
}

export default function HoverExpandFilter({
  label,
  activeLabel,
  options,
  selectedValues,
  onToggle,
}: HoverExpandFilterProps) {
  const hasSelection = activeLabel !== null;

  return (
    <div className="group relative">
      {/* Collapsed pill -- visible when NOT hovered */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer whitespace-nowrap",
          "transition-all duration-200",
          "group-hover:opacity-0 group-hover:pointer-events-none",
          hasSelection
            ? "bg-primary/20 text-primary border-primary/40"
            : "bg-white/10 border-white/20 text-gray-300"
        )}
      >
        {hasSelection ? activeLabel : label}
        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded options -- visible on hover */}
      <div
        className={cn(
          "absolute top-0 left-0 flex items-center gap-1 px-2 py-1 rounded-full",
          "bg-gray-900/95 backdrop-blur-md border border-white/20 shadow-lg",
          "opacity-0 pointer-events-none scale-95",
          "group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100",
          "transition-all duration-200 origin-left z-50"
        )}
      >
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1.5 whitespace-nowrap">
          {label}
        </span>
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value);
          return (
            <button
              key={String(opt.value)}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(opt.value);
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                isSelected
                  ? "bg-primary text-white"
                  : "text-gray-300 hover:bg-white/10"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
