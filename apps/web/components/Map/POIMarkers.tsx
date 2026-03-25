"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { CURATED_POIS, POI_LAYERS } from "@/lib/poi-data";
import type { POI, POILayer } from "@/lib/poi-data";

interface POIMarkersProps {
  map: mapboxgl.Map | null;
  mapLoaded: boolean;
  activeLayers: Set<string>;
}

const SOURCE_ID = "poi-source";
const CIRCLE_LAYER_ID = "poi-circles";
const SYMBOL_LAYER_ID = "poi-symbols";

// Static lookups (built once at module level)
const POI_LOOKUP = new Map(CURATED_POIS.map((p) => [p.id, p]));
const LAYER_LOOKUP = new Map(POI_LAYERS.map((l) => [l.id, l]));

// Icon character per layer icon name
const LAYER_ICON_CHAR: Record<string, string> = {
  banknote: "$",
  waves: "~",
  "heart-pulse": "+",
  "shopping-cart": "S",
  laptop: "W",
  dumbbell: "G",
  bike: "M",
  utensils: "R",
  "map-pin": "T",
};

// ---------------------------------------------------------------------------
// Build GeoJSON FeatureCollection from active POIs
// ---------------------------------------------------------------------------
function buildGeoJSON(
  activeLayers: Set<string>
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features = CURATED_POIS.filter((poi) => {
    if (activeLayers.has(poi.category)) return true;
    if (
      poi.subcategory &&
      activeLayers.has(`${poi.category}:${poi.subcategory}`)
    )
      return true;
    return false;
  }).map((poi) => {
    const layer = LAYER_LOOKUP.get(poi.category);
    const iconChar = layer?.icon ? LAYER_ICON_CHAR[layer.icon] ?? "·" : "·";

    return {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [poi.lng, poi.lat] as [number, number],
      },
      properties: {
        id: poi.id,
        name: poi.name,
        category: poi.category,
        iconChar,
      },
    };
  });

  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// Data-driven color expression: category → color
// ---------------------------------------------------------------------------
function buildColorMatch(): unknown[] {
  const expr: unknown[] = ["match", ["get", "category"]];
  for (const l of POI_LAYERS) {
    expr.push(l.id, l.color);
  }
  expr.push("#6B7280"); // fallback
  return expr;
}

// ---------------------------------------------------------------------------
// Popup HTML
// ---------------------------------------------------------------------------
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  recommended: { bg: "#FEF3C7", text: "#92400E" },
  "free-atm": { bg: "#D1FAE5", text: "#065F46" },
  avoid: { bg: "#FEE2E2", text: "#991B1B" },
  "english-spoken": { bg: "#DBEAFE", text: "#1E40AF" },
};

const DEFAULT_TAG = { bg: "#F3F4F6", text: "#4B5563" };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPopupHTML(poi: POI, layer: POILayer | undefined): string {
  const color = layer?.color ?? "#6B7280";
  const metaEntries = Object.entries(poi.meta);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;

  let html = `<div style="max-width:260px;min-width:200px">`;
  html += `<div style="height:4px;background:${color};border-radius:12px 12px 0 0"></div>`;
  html += `<div style="padding:10px 12px">`;
  html += `<div style="font-size:13px;font-weight:600;color:#1f2937;line-height:1.3">${escapeHtml(poi.name)}</div>`;

  if (poi.address) {
    html += `<div style="font-size:11px;color:#9ca3af;margin-top:2px">${escapeHtml(poi.address)}</div>`;
  }
  if (poi.description) {
    html += `<p style="font-size:13px;color:#4b5563;margin-top:6px;line-height:1.4">${escapeHtml(poi.description)}</p>`;
  }

  if (metaEntries.length > 0) {
    html += `<div style="margin-top:8px">`;
    for (const [key, value] of metaEntries) {
      let valueColor = "#374151";
      if (poi.category === "atm" && value === "FREE") valueColor = "#059669";
      else if (poi.category === "atm" && key === "fee" && value !== "FREE")
        valueColor = "#DC2626";
      html += `<div style="display:flex;gap:6px;font-size:11px;margin-bottom:2px">`;
      html += `<span style="color:#9ca3af;font-weight:500;text-transform:capitalize;min-width:36px">${escapeHtml(key)}:</span>`;
      html += `<span style="font-weight:500;color:${valueColor}">${escapeHtml(value)}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  if (poi.tags.length > 0) {
    html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">`;
    for (const tag of poi.tags) {
      const c = TAG_COLORS[tag] ?? DEFAULT_TAG;
      html += `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:500;background:${c.bg};color:${c.text}">${escapeHtml(tag)}</span>`;
    }
    html += `</div>`;
  }

  if (poi.hours) {
    html += `<div style="font-size:11px;color:#6b7280;margin-top:8px"><span style="font-weight:500">Hours:</span> ${escapeHtml(poi.hours)}</div>`;
  }

  html += `<div style="display:flex;gap:12px;margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6">`;
  html += `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:500;color:var(--primary,#0077B6);text-decoration:none">Directions</a>`;
  if (poi.url) {
    html += `<a href="${escapeHtml(poi.url)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:500;color:var(--primary,#0077B6);text-decoration:none">Website</a>`;
  }
  if (poi.phone) {
    html += `<a href="tel:${escapeHtml(poi.phone)}" style="font-size:11px;font-weight:500;color:var(--primary,#0077B6);text-decoration:none">Call</a>`;
  }
  html += `</div></div></div>`;

  return html;
}

// ---------------------------------------------------------------------------
// Component — uses native Mapbox source + layers (no HTML markers)
// ---------------------------------------------------------------------------
export default function POIMarkers({
  map,
  mapLoaded,
  activeLayers,
}: POIMarkersProps) {
  const sourceAdded = useRef(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // One-time: add GeoJSON source + circle/symbol layers + event handlers
  useEffect(() => {
    if (!map || !mapLoaded || sourceAdded.current) return;

    // Empty source — data gets set in the next useEffect
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Colored circle per POI, driven by category
    map.addLayer({
      id: CIRCLE_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": 10,
        "circle-color": buildColorMatch() as any,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });

    // Icon character label on top of each circle
    map.addLayer({
      id: SYMBOL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      layout: {
        "text-field": ["get", "iconChar"],
        "text-size": 11,
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-allow-overlap": true,
        "icon-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
      },
    });

    // Click → open native Mapbox popup
    map.on("click", CIRCLE_LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties;
      if (!props) return;

      const poi = POI_LOOKUP.get(props.id as string);
      if (!poi) return;
      const layer = LAYER_LOOKUP.get(poi.category);

      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({
        offset: 16,
        closeButton: true,
        closeOnClick: true,
        maxWidth: "280px",
      })
        .setLngLat(e.lngLat)
        .setHTML(buildPopupHTML(poi, layer))
        .addTo(map);
    });

    // Pointer cursor on hover
    map.on("mouseenter", CIRCLE_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CIRCLE_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    sourceAdded.current = true;

    return () => {
      popupRef.current?.remove();
      try {
        if (map.getLayer(SYMBOL_LAYER_ID)) map.removeLayer(SYMBOL_LAYER_ID);
        if (map.getLayer(CIRCLE_LAYER_ID)) map.removeLayer(CIRCLE_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map may already be destroyed during page navigation
      }
      sourceAdded.current = false;
    };
  }, [map, mapLoaded]);

  // Update source data whenever activeLayers changes
  useEffect(() => {
    if (!map || !mapLoaded || !sourceAdded.current) return;

    const source = map.getSource(SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!source) return;

    source.setData(buildGeoJSON(activeLayers));
  }, [map, mapLoaded, activeLayers]);

  return null;
}
