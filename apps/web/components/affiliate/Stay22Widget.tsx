"use client";

import { useEffect, useRef } from "react";

interface Stay22WidgetProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export default function Stay22Widget({
  latitude,
  longitude,
  locationName,
}: Stay22WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  const aid = process.env.NEXT_PUBLIC_STAY22_ID;

  useEffect(() => {
    if (!aid || scriptLoaded.current) return;

    const existing = document.querySelector(
      'script[src="https://www.stay22.com/embed.js"]'
    );
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.stay22.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
    scriptLoaded.current = true;
  }, [aid]);

  if (!aid) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Accommodation nearby
      </h2>
      <div
        ref={containerRef}
        className="stay22-widget rounded-xl overflow-hidden border border-amber-200/60"
        data-aid={aid}
        data-lat={latitude}
        data-lng={longitude}
        data-title={locationName || "Da Nang, Vietnam"}
        style={{ minHeight: 300 }}
      />
    </div>
  );
}
