"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import AreaCards from "@/components/Listings/AreaCards";
import QuickFilters, {
  Filters,
  DEFAULT_FILTERS,
} from "@/components/Listings/QuickFilters";
import ListingPanel from "@/components/Listings/ListingPanel";
import MobileBottomSheet from "@/components/Listings/MobileBottomSheet";
import MapLayerToggle from "@/components/Map/MapLayerToggle";
import AreaOverviewPanel from "@/components/Map/AreaOverviewPanel";
import Footer from "@/components/Layout/Footer";
import { getPOICoordinatesByCategories, POICategory } from "@/lib/poi-data";
import { getAreaGuideByMapSlug } from "@/lib/area-guides-data";
import { AREA_BOUNDARIES } from "@/lib/area-boundaries";
import type { FlyToArea } from "@/components/Map/MapView";
import SaveSearchModal from "@/components/SavedSearch/SaveSearchModal";

const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Loading map...</span>
    </div>
  ),
});

interface Listing {
  id: string;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  thumbnail_url: string | null;
  price_vnd: number | null;
  price_usd: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  area_name: string | null;
  source_platform: string;
  property_type: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  first_seen_at: string;
  source_count?: number;
}

const AREA_SLUG_TO_NAME: Record<string, string> = {
  "an-thuong": "An Thuong / My An",
  "son-tra": "Son Tra",
  "hai-chau": "Hai Chau (Downtown)",
  "ngu-hanh-son": "Ngu Hanh Son (Marble Mountains)",
  "lien-chieu": "Lien Chieu (North)",
};

interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  price_vnd: number | null;
  property_type: string | null;
  area_name: string | null;
  first_seen_at: string | null;
  thumbnail_url: string | null;
  title_en: string | null;
  title: string | null;
}

const MAP_CENTER: [number, number] = [108.22, 16.06];

export default function ListingExplorer({
  initialFilters = DEFAULT_FILTERS,
}: {
  initialFilters?: Filters;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapHoveredId, setMapHoveredId] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [flyToArea, setFlyToArea] = useState<FlyToArea | null>(null);
  const [mapBounds, setMapBounds] = useState<{
    north: number; south: number; east: number; west: number;
  } | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isFlying = useRef<boolean>(false);

  const isFlyingRef = useRef<boolean>(false);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const selectedAreaSlug = filters.areas.length === 1 ? filters.areas[0] : null;

  const handleBoundsChange = useCallback((bounds: {
    north: number; south: number; east: number; west: number;
  }) => {
    if (isFlyingRef.current) return;
    clearTimeout(boundsTimerRef.current);
    boundsTimerRef.current = setTimeout(() => setMapBounds(bounds), 300);
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.areas.length > 0) {
      params.set("areas", filters.areas.map((s) => AREA_SLUG_TO_NAME[s] || s).join(","));
    }
    if (filters.priceMin > 0) params.set("price_min", String(filters.priceMin));
    if (filters.priceMax < 100000000) params.set("price_max", String(filters.priceMax));
    if (filters.propertyTypes.length > 0) params.set("property_types", filters.propertyTypes.join(","));
    if (filters.bedrooms !== null) params.set("bedrooms", String(filters.bedrooms));
    if (filters.postedWithinHours !== null) params.set("posted_within_hours", String(filters.postedWithinHours));
    if (filters.nearPOIs.length > 0) {
      const coords = getPOICoordinatesByCategories(filters.nearPOIs as POICategory[]);
      if (coords.length > 0) {
        params.set("near_latlngs", coords.map((c) => `${c.lat},${c.lng}`).join(";"));
        params.set("near_distance", String(filters.nearDistance));
      }
    }
    return params;
  }, [filters]);

  const fetchMapPins = useCallback(async () => {
    try {
      const params = buildFilterParams();
      params.set("map_pins", "true");
      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      setMapPins(data.pins || []);
    } catch (e) {
      console.error("Failed to fetch map pins:", e);
    }
  }, [buildFilterParams]);

  const fetchListings = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const params = buildFilterParams();
      if (mapBounds) {
        params.set("north", String(mapBounds.north));
        params.set("south", String(mapBounds.south));
        params.set("east", String(mapBounds.east));
        params.set("west", String(mapBounds.west));
      }
      params.set("sort", filters.sortBy);
      params.set("per_page", "50");
      params.set("page", String(pageNum));

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      const newListings = data.listings || [];
      if (append) {
        setListings(prev => [...prev, ...newListings]);
      } else {
        setListings(newListings);
      }
      setTotal(data.total || 0);
      setHasMore(newListings.length >= 50);
      setPage(pageNum);
    } catch (e) {
      console.error("Failed to fetch listings:", e);
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, filters.sortBy, mapBounds]);

  const handleLoadMore = useCallback(() => {
    fetchListings(page + 1, true);
  }, [fetchListings, page]);

  useEffect(() => { fetchMapPins(); }, [fetchMapPins]);
  useEffect(() => { setPage(1); fetchListings(1, false); }, [fetchListings]);

  const handleSelectArea = useCallback((slug: string | null) => {
    setFilters((prev) => ({ ...prev, areas: slug ? [slug] : [] }));
    if (slug) {
      const area = AREA_BOUNDARIES.find((a) => a.slug === slug);
      if (area) setFlyToArea({ center: area.center, slug });
    } else {
      setFlyToArea({ center: MAP_CENTER, slug: "all" });
    }
  }, []);

  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  const handleAreaClick = (slug: string) => {
    setFilters((prev) => ({
      ...prev,
      areas: prev.areas.includes(slug) ? prev.areas : [...prev.areas, slug],
    }));
  };

  const handleToggleLayer = (id: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={`w-screen ${isFullscreen ? "h-screen flex flex-col overflow-hidden" : ""}`}>
      {/* === HEADER: Area cards + filter bar === */}
      <div className={`relative z-20 flex-shrink-0`}>
        {!isFullscreen && (
          <AreaCards
            selectedAreaSlug={selectedAreaSlug}
            onSelectArea={handleSelectArea}
            mapPins={mapPins}
          />
        )}
        <QuickFilters
          filters={filters}
          onChange={handleFiltersChange}
          totalCount={total}
          loading={loading}
          onSaveSearch={() => setSaveSearchOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />
      </div>

      {/* === MAP SECTION === */}
      <div className={`relative w-full ${isFullscreen ? "flex-1 min-h-0" : ""}`} style={isFullscreen ? undefined : { height: "100vh" }}>
        {/* Map fills the entire section */}
        <div className="absolute inset-0 z-0">
          <MapView
            listings={mapPins}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onListingClick={async (id) => {
              setSelectedId(id);
              setPanelCollapsed(false);
              // If listing isn't in current results, fetch it so the panel can show it
              if (!listings.find((l) => l.id === id)) {
                try {
                  const pin = mapPins.find((p) => p.id === id);
                  // Fetch a small window around the pin to get the full listing data
                  if (pin && pin.latitude && pin.longitude) {
                    const delta = 0.001; // ~100m
                    const res = await fetch(`/api/listings?north=${pin.latitude + delta}&south=${pin.latitude - delta}&east=${pin.longitude + delta}&west=${pin.longitude - delta}&limit=1&per_page=5`);
                    const data = await res.json();
                    const match = data.listings?.find((l: any) => l.id === id);
                    if (match) {
                      setListings((prev) => [match, ...prev]);
                    }
                  }
                } catch (e) {
                  console.error("Failed to fetch clicked listing:", e);
                }
              }
            }}
            onListingHover={(id) => setMapHoveredId(id)}
            onAreaClick={handleAreaClick}
            onAreaSelect={(slug) => setSelectedArea(slug)}
            onBoundsChange={handleBoundsChange}
            activeLayers={activeLayers}
            flyToArea={flyToArea}
            isFlyingRef={isFlyingRef}
            panelWidth={panelCollapsed ? 0 : 420}
          />
        </div>

        {/* Listing panel (desktop) — positioned within map section */}
        <div className="hidden md:block">
          <ListingPanel
            listings={listings}
            selectedId={selectedId}
            highlightedId={mapHoveredId}
            onHover={setHoveredId}
            onSelect={setSelectedId}
            loading={loading}
            total={total}
            isCollapsed={panelCollapsed}
            onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            sortBy={filters.sortBy}
            onSortChange={(sort) => setFilters(prev => ({ ...prev, sortBy: sort }))}
          />
        </div>

        {/* Mobile bottom sheet — positioned within map section */}
        <div className="md:hidden">
          <MobileBottomSheet
            listings={listings}
            selectedId={selectedId}
            highlightedId={mapHoveredId}
            onHover={setHoveredId}
            loading={loading}
            total={total}
          />
        </div>

        {/* Map overlays */}
        {selectedArea && (() => {
          const areaGuide = getAreaGuideByMapSlug(selectedArea);
          if (!areaGuide) return null;
          return (
            <AreaOverviewPanel
              area={areaGuide}
              onShowListings={() => {
                setFilters((prev) => ({ ...prev, areas: [selectedArea] }));
                setSelectedArea(null);
              }}
              onClose={() => setSelectedArea(null)}
            />
          );
        })()}

        {/* Filter summary badge */}
        {(filters.areas.length > 0 || filters.propertyTypes.length > 0) && (
          <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-sm font-medium text-gray-700">
            {total.toLocaleString()} {filters.propertyTypes.length > 0 ? filters.propertyTypes.join(", ") : "listings"}
            {filters.areas.length > 0 && ` in ${filters.areas.map(s => (AREA_SLUG_TO_NAME[s] || s)).join(", ")}`}
          </div>
        )}

        <MapLayerToggle
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          listingCount={total}
        />
      </div>

      {/* === FOOTER: appears when scrolling past the map === */}
      {!isFullscreen && <Footer />}

      <SaveSearchModal
        filters={filters}
        isOpen={saveSearchOpen}
        onClose={() => setSaveSearchOpen(false)}
      />
    </div>
  );
}
