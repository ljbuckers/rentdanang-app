"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import POIMarkers from "./POIMarkers";
import MapLegend from "./MapLegend";
import { AREA_BOUNDARIES } from "@/lib/area-boundaries";

const MAP_CENTER: [number, number] = [108.22, 16.06]; // [lng, lat]
const MAP_ZOOM = 12;

// Layer IDs
const LISTINGS_SOURCE = "listings-source";
const LISTINGS_NEW_RING = "listings-new-ring";
const LISTINGS_SHADOW = "listings-shadow";
const LISTINGS_BG = "listings-bg";
const LISTINGS_TEXT = "listings-text";
const LISTINGS_ACTIVE_TEXT = "listings-active-text";

interface Listing {
  id: string;
  latitude: number | null;
  longitude: number | null;
  price_vnd: number | null;
  property_type?: string | null;
  area_name?: string | null;
  first_seen_at?: string | null;
  thumbnail_url?: string | null;
  title_en?: string | null;
  title?: string | null;
}

export interface FlyToArea {
  center: [number, number];
  slug: string;
}

interface MapViewProps {
  listings: Listing[];
  selectedId?: string | null;
  hoveredId?: string | null;
  onListingClick?: (id: string) => void;
  onListingHover?: (id: string | null) => void;
  onAreaClick?: (slug: string) => void;
  onAreaSelect?: (slug: string) => void;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  activeLayers?: Set<string>;
  flyToArea?: FlyToArea | null;
  panelWidth?: number;
  isFlyingRef?: React.MutableRefObject<boolean>;
}

const NEW_LISTING_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildListingsGeoJSON(
  listings: Listing[],
  selectedId?: string | null,
  hoveredId?: string | null
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  const now = Date.now();

  for (const l of listings) {
    if (!l.latitude || !l.longitude) continue;
    const isSelected = l.id === selectedId;
    const isHovered = l.id === hoveredId;
    const isNewListing = l.first_seen_at
      ? now - new Date(l.first_seen_at).getTime() < NEW_LISTING_MS
      : false;
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(l.longitude), Number(l.latitude)],
      },
      properties: {
        id: l.id,
        priceText: l.price_vnd
          ? `${(l.price_vnd / 1_000_000).toFixed(0)}M`
          : "?",
        priceVnd: l.price_vnd ?? 0,
        propertyType: l.property_type || "other",
        isNewListing,
        isSelected,
        isHovered,
        isActive: isSelected || isHovered,
        sortKey: isSelected ? 0 : isHovered ? 0 : 1,
        thumbnailUrl: l.thumbnail_url || null,
        title: l.title || l.title_en || null,
        areaName: l.area_name || null,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

export default function MapView({
  listings,
  selectedId,
  hoveredId,
  onListingClick,
  onListingHover,
  onAreaClick,
  onAreaSelect,
  onBoundsChange,
  activeLayers,
  flyToArea,
  panelWidth = 0,
  isFlyingRef,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onClickRef = useRef(onListingClick);
  onClickRef.current = onListingClick;
  const onHoverRef = useRef(onListingHover);
  onHoverRef.current = onListingHover;
  const onAreaClickRef = useRef(onAreaClick);
  onAreaClickRef.current = onAreaClick;
  const onAreaSelectRef = useRef(onAreaSelect);
  onAreaSelectRef.current = onAreaSelect;
  const mapHoveredRef = useRef<string | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!mapContainer.current || map.current || !token) return;

    mapboxgl.accessToken = token;

    // Restore previous map position if returning from a listing detail page
    let initCenter: [number, number] = MAP_CENTER;
    let initZoom = MAP_ZOOM;
    try {
      const saved = sessionStorage.getItem("mapState");
      if (saved) {
        const parsed = JSON.parse(saved);
        initCenter = parsed.center;
        initZoom = parsed.zoom;
      }
    } catch {}

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initCenter,
      zoom: initZoom,
      attributionControl: false,
      scrollZoom: true,
    });

    m.addControl(new mapboxgl.NavigationControl(), "top-right");
    m.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    m.on("load", () => {
      // -- Area boundary polygons --
      AREA_BOUNDARIES.forEach((area) => {
        m.addSource(`area-${area.slug}`, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { name: area.name, slug: area.slug },
            geometry: {
              type: "Polygon",
              coordinates: [area.polygon],
            },
          },
        });

        m.addLayer({
          id: `area-fill-${area.slug}`,
          type: "fill",
          source: `area-${area.slug}`,
          paint: {
            "fill-color": area.color,
            "fill-opacity": 0.12,
          },
        });

        m.addLayer({
          id: `area-border-${area.slug}`,
          type: "line",
          source: `area-${area.slug}`,
          paint: {
            "line-color": area.color,
            "line-width": 2.5,
            "line-opacity": 0.6,
          },
        });

        m.on("click", `area-fill-${area.slug}`, (e: mapboxgl.MapLayerMouseEvent) => {
          const hits = m.queryRenderedFeatures(e.point, {
            layers: [LISTINGS_BG],
          });
          if (hits.length > 0) return;
          onAreaSelectRef.current?.(area.slug);
          m.flyTo({ center: area.center, zoom: 14, duration: 1000, padding: { right: panelWidth, top: 0, bottom: 0, left: 0 } });
        });

        m.on("mouseenter", `area-fill-${area.slug}`, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", `area-fill-${area.slug}`, () => {
          m.getCanvas().style.cursor = "";
        });
      });

      // -- Area name labels --
      m.addSource("area-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: AREA_BOUNDARIES.map((area) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: area.center },
            properties: { name: area.name },
          })),
        },
      });

      m.addLayer({
        id: "area-label-text",
        type: "symbol",
        source: "area-labels",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 13,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-allow-overlap": false,
          "text-padding": 10,
        },
        paint: {
          "text-color": "#4B5563",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
          "text-opacity": 0.8,
        },
      });

      // -- Listing source (with clustering) --
      m.addSource(LISTINGS_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: LISTINGS_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#93C5FD", 10,
            "#60A5FA", 30,
            "#3B82F6", 100,
            "#2563EB"
          ] as any,
          "circle-radius": [
            "step", ["get", "point_count"],
            18, 10,
            24, 30,
            30, 100,
            36
          ] as any,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count labels
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: LISTINGS_SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 13,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Click on cluster to zoom in
      m.on("click", "clusters", (e: mapboxgl.MapLayerMouseEvent) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const source = m.getSource(LISTINGS_SOURCE) as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number | null | undefined) => {
          if (err || zoom == null) return;
          m.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      m.on("mouseenter", "clusters", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "clusters", () => { m.getCanvas().style.cursor = ""; });

      m.addLayer({
        id: LISTINGS_NEW_RING,
        type: "circle",
        source: LISTINGS_SOURCE,
        filter: ["all", ["!", ["has", "point_count"]], ["boolean", ["get", "isNewListing"], false]],
        paint: {
          "circle-radius": 18,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#f59e0b",
          "circle-opacity": 0.85,
        },
      });

      m.addLayer({
        id: LISTINGS_SHADOW,
        type: "circle",
        source: LISTINGS_SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 16,
          "circle-color": "rgba(0,0,0,0.06)",
          "circle-blur": 0.5,
          "circle-translate": [0, 2] as any,
        },
      });

      m.addLayer({
        id: LISTINGS_BG,
        type: "circle",
        source: LISTINGS_SOURCE,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "circle-sort-key": ["get", "sortKey"] as any,
        } as any,
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["get", "isSelected"], false],
            17,
            ["boolean", ["get", "isHovered"], false],
            16,
            14,
          ] as any,
          "circle-color": [
            "case",
            ["boolean", ["get", "isSelected"], false],
            "#D97706",
            [
              "match",
              ["get", "propertyType"],
              "apartment", "#DBEAFE",
              "studio", "#DBEAFE",
              "house", "#FEF9C3",
              "villa", "#DCFCE7",
              "#F3F4F6",
            ],
          ] as any,
          "circle-stroke-width": [
            "case",
            ["boolean", ["get", "isSelected"], false],
            2,
            ["boolean", ["get", "isHovered"], false],
            2,
            1.5,
          ] as any,
          "circle-stroke-color": [
            "case",
            ["boolean", ["get", "isSelected"], false],
            "#B45309",
            ["boolean", ["get", "isHovered"], false],
            "#6B7280",
            [
              "match",
              ["get", "propertyType"],
              "apartment", "#3B82F6",
              "studio", "#3B82F6",
              "house", "#EAB308",
              "villa", "#22C55E",
              "#9CA3AF",
            ],
          ] as any,
        },
      });

      m.addLayer({
        id: LISTINGS_TEXT,
        type: "symbol",
        source: LISTINGS_SOURCE,
        filter: ["all", ["!", ["has", "point_count"]], ["!", ["get", "isActive"]]],
        layout: {
          "text-field": ["get", "priceText"] as any,
          "text-size": 12,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "text-optional": true,
          "text-padding": 4,
          "symbol-sort-key": ["get", "sortKey"] as any,
        },
        paint: {
          "text-color": [
            "match",
            ["get", "propertyType"],
            "apartment", "#1E40AF",
            "studio", "#1E40AF",
            "house", "#854D0E",
            "villa", "#166534",
            "#374151",
          ] as any,
        },
      });

      m.addLayer({
        id: LISTINGS_ACTIVE_TEXT,
        type: "symbol",
        source: LISTINGS_SOURCE,
        filter: ["all", ["!", ["has", "point_count"]], ["get", "isActive"]],
        layout: {
          "text-field": ["get", "priceText"] as any,
          "text-size": 12,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": [
            "case",
            ["boolean", ["get", "isSelected"], false],
            "#ffffff",
            "#1f2937",
          ] as any,
        },
      });

      m.on("click", LISTINGS_BG, (e: mapboxgl.MapLayerMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const id = feature.properties?.id as string;
          const thumbnailUrl = feature.properties?.thumbnailUrl as string | null;
          const title = feature.properties?.title as string | null;
          const priceText = feature.properties?.priceText as string;
          const propertyType = feature.properties?.propertyType as string;
          const areaName = feature.properties?.areaName as string | null;
          const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

          if (id) {
            onClickRef.current?.(id);

            let popupHtml = `
              <div style="font-family: sans-serif; padding: 5px; width: 200px;">
                ${thumbnailUrl ? `<img src="${thumbnailUrl}" style="width: 100%; height: 120px; object-fit: cover; margin-bottom: 8px; border-radius: 4px;" alt="Listing thumbnail"/>` : ''}
                <div style="font-weight: bold; font-size: 1.1em; margin-bottom: 4px;">${title || 'No Title'}</div>
                <div style="color: #4a5568; font-size: 0.9em; margin-bottom: 4px;">
                  ${priceText} &bull; ${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} ${areaName ? `&bull; ${areaName}` : ''}
                </div>
                <a href="/listings/${id}" style="color: #3b82f6; text-decoration: none; font-weight: 500; font-size: 0.9em;">View Details</a>
              </div>
            `;

            new mapboxgl.Popup()
              .setLngLat(coordinates)
              .setHTML(popupHtml)
              .addTo(map.current!);
          }
        }
      });

      m.on("mousemove", LISTINGS_BG, (e: mapboxgl.MapLayerMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const id = e.features[0].properties?.id as string;
          if (id && id !== mapHoveredRef.current) {
            mapHoveredRef.current = id;
            onHoverRef.current?.(id);
          }
        }
        m.getCanvas().style.cursor = "pointer";
      });

      m.on("mouseleave", LISTINGS_BG, () => {
        mapHoveredRef.current = null;
        onHoverRef.current?.(null);
        m.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
    });

    m.on("moveend", () => {
      const bounds = m.getBounds();
      if (!bounds) return;
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
      // Persist map position for back-to-map navigation
      try {
        sessionStorage.setItem("mapState", JSON.stringify({
          center: [m.getCenter().lng, m.getCenter().lat],
          zoom: m.getZoom(),
        }));
      } catch {}
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource(LISTINGS_SOURCE) as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!source) return;
    source.setData(buildListingsGeoJSON(listings, selectedId, hoveredId));
  }, [listings, selectedId, hoveredId, mapLoaded]);

  useEffect(() => {
    if (!map.current || !selectedId) return;
    const listing = listings.find((l) => l.id === selectedId);
    if (listing?.latitude && listing?.longitude) {
      if (isFlyingRef) isFlyingRef.current = true;
      map.current.flyTo({
        center: [listing.longitude, listing.latitude],
        zoom: 15,
        duration: 800,
        padding: { right: panelWidth, top: 0, bottom: 0, left: 0 },
      });
      map.current.once("moveend", () => {
        if (isFlyingRef) isFlyingRef.current = false;
      });
    }
  }, [selectedId, listings, panelWidth, isFlyingRef]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !flyToArea) return;
    if (isFlyingRef) isFlyingRef.current = true;

    if (flyToArea.slug === "all") {
      map.current.flyTo({
        center: flyToArea.center,
        zoom: 12,
        duration: 1000,
        padding: { right: panelWidth, top: 0, bottom: 0, left: 0 },
      });
    } else {
      // Use fitBounds on the area polygon so the full district is visible
      const area = AREA_BOUNDARIES.find((a) => a.slug === flyToArea.slug);
      if (area) {
        const lngs = area.polygon.map((p) => p[0]);
        const lats = area.polygon.map((p) => p[1]);
        const bounds = new mapboxgl.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        );
        map.current.fitBounds(bounds, {
          duration: 1000,
          padding: { right: panelWidth + 20, top: 40, bottom: 40, left: 20 },
          maxZoom: 15,
        });
      } else {
        map.current.flyTo({
          center: flyToArea.center,
          zoom: 14,
          duration: 1000,
          padding: { right: panelWidth, top: 0, bottom: 0, left: 0 },
        });
      }
    }

    map.current.once("moveend", () => {
      if (isFlyingRef) isFlyingRef.current = false;
    });
  }, [flyToArea, mapLoaded, panelWidth, isFlyingRef]);

  // Re-center map when panel expands/collapses
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    // Let the CSS transition finish, then resize + adjust padding
    const timer = setTimeout(() => {
      map.current?.resize();
      map.current?.easeTo({
        padding: { right: panelWidth, top: 0, bottom: 0, left: 0 },
        duration: 300,
      });
    }, 320);
    return () => clearTimeout(timer);
  }, [panelWidth, mapLoaded]);

  if (!token) {
    return (
      <div className="w-full h-full min-h-[400px] bg-gray-100 flex flex-col items-center justify-center text-gray-500">
        <svg
          className="w-12 h-12 mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="font-medium">Map unavailable</p>
        <p className="text-sm mt-1">Set NEXT_PUBLIC_MAPBOX_TOKEN to enable</p>
      </div>
    );
  }

  return (
    <>
      <div ref={mapContainer} className="w-full h-full min-h-[400px] relative" role="application" aria-label="Interactive map of rental listings in Da Nang">
        <MapLegend />
      </div>
      {activeLayers && (
        <POIMarkers
          map={map.current}
          mapLoaded={mapLoaded}
          activeLayers={activeLayers}
        />
      )}
    </>
  );
}
