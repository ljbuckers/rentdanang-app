export type POICategory =
  | "atm"
  | "beach"
  | "healthcare"
  | "grocery"
  | "coworking"
  | "gym"
  | "motorbike"
  | "restaurant"
  | "daytrip";

export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: POICategory;
  subcategory?: string;
  description?: string;
  address?: string;
  hours?: string;
  rating?: number;
  tags: string[];
  meta: Record<string, string>;
  url?: string;
  phone?: string;
}

export interface POILayer {
  id: POICategory;
  label: string;
  icon: string;
  color: string;
  description: string;
  subcategories?: { id: string; label: string }[];
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export const POI_LAYERS: POILayer[] = [
  {
    id: "atm",
    label: "ATMs & Banks",
    icon: "banknote",
    color: "#FFD700",
    description: "ATMs and bank branches with fee and limit info",
    subcategories: [
      { id: "vpbank", label: "VPBank" },
      { id: "acb", label: "ACB (Free)" },
      { id: "tpbank", label: "TPBank" },
      { id: "other-bank", label: "Other" },
    ],
  },
  {
    id: "beach",
    label: "Beaches",
    icon: "waves",
    color: "#45B7D1",
    description: "Beaches around Da Nang and Son Tra",
    subcategories: [
      { id: "swimming", label: "Swimming" },
      { id: "surf", label: "Surf" },
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    icon: "heart-pulse",
    color: "#FF6B6B",
    description: "Hospitals, pharmacies, and dental clinics",
    subcategories: [
      { id: "hospital", label: "Hospital" },
      { id: "pharmacy", label: "Pharmacy" },
      { id: "dental", label: "Dental" },
    ],
  },
  {
    id: "grocery",
    label: "Groceries",
    icon: "shopping-cart",
    color: "#4ECDC4",
    description: "Supermarkets, markets, and convenience stores",
    subcategories: [
      { id: "supermarket", label: "Supermarket" },
      { id: "market", label: "Market" },
      { id: "convenience", label: "Convenience" },
    ],
  },
  {
    id: "coworking",
    label: "Coworking & Cafes",
    icon: "laptop",
    color: "#9B59B6",
    description: "Coworking spaces and work-friendly cafes",
  },
  {
    id: "gym",
    label: "Gyms & Fitness",
    icon: "dumbbell",
    color: "#E67E22",
    description: "Gyms, fitness centers, and yoga studios",
  },
  {
    id: "motorbike",
    label: "Motorbike Rental",
    icon: "bike",
    color: "#2C3E50",
    description: "Motorbike and scooter rental shops",
  },
  {
    id: "restaurant",
    label: "Restaurants & Bars",
    icon: "utensils",
    color: "#E74C3C",
    description: "Restaurants, bars, and cafes",
  },
  {
    id: "daytrip",
    label: "Day Trips",
    icon: "map-pin",
    color: "#1ABC9C",
    description: "Day trip destinations from Da Nang",
  },
];

// ---------------------------------------------------------------------------
// Curated POIs
// ---------------------------------------------------------------------------

export const CURATED_POIS: POI[] = [
  // ── ATMs ────────────────────────────────────────────────────────────────
  {
    id: "atm-1",
    name: "VPBank ATM An Thuong",
    lat: 16.0472,
    lng: 108.2418,
    category: "atm",
    subcategory: "vpbank",
    tags: ["recommended", "free-atm"],
    meta: {
      fee: "FREE",
      limit: "10,000,000 VND",
      tip: "Best ATM for foreigners. No daily limit.",
    },
  },
  {
    id: "atm-2",
    name: "VPBank ATM Son Tra",
    lat: 16.0845,
    lng: 108.2355,
    category: "atm",
    subcategory: "vpbank",
    tags: ["recommended", "free-atm"],
    meta: {
      fee: "FREE",
      limit: "10,000,000 VND",
    },
  },
  {
    id: "atm-3",
    name: "VPBank Branch Hai Chau",
    lat: 16.069,
    lng: 108.22,
    category: "atm",
    subcategory: "vpbank",
    tags: ["recommended", "free-atm", "branch"],
    meta: {
      fee: "FREE",
      limit: "10,000,000 VND",
      tip: "Full branch - can open account",
    },
  },
  {
    id: "atm-4",
    name: "VPBank ATM Ngu Hanh Son",
    lat: 16.025,
    lng: 108.245,
    category: "atm",
    subcategory: "vpbank",
    tags: ["recommended", "free-atm"],
    meta: {
      fee: "FREE",
      limit: "10,000,000 VND",
    },
  },
  {
    id: "atm-5",
    name: "ACB ATM An Thuong",
    lat: 16.0455,
    lng: 108.244,
    category: "atm",
    subcategory: "acb",
    tags: ["free-atm"],
    meta: {
      fee: "FREE",
      limit: "3,000,000 VND",
    },
  },
  {
    id: "atm-6",
    name: "ACB Branch Hai Chau",
    lat: 16.0665,
    lng: 108.219,
    category: "atm",
    subcategory: "acb",
    tags: ["free-atm", "branch"],
    meta: {
      fee: "FREE",
      limit: "3,000,000 VND",
    },
  },
  {
    id: "atm-7",
    name: "TPBank ATM An Thuong",
    lat: 16.048,
    lng: 108.2425,
    category: "atm",
    subcategory: "tpbank",
    tags: ["avoid"],
    meta: {
      fee: "~3.3%",
      limit: "5-13,000,000 VND",
      tip: "Was free, now charges since Jun 2025. AVOID.",
    },
  },

  // ── Beaches ─────────────────────────────────────────────────────────────
  {
    id: "beach-1",
    name: "My Khe Beach",
    lat: 16.06,
    lng: 108.248,
    category: "beach",
    subcategory: "swimming",
    description:
      "Main beach. Lifeguards, volleyball, sunrise. Packed after 5pm.",
    tags: ["popular", "lifeguards"],
    meta: {},
  },
  {
    id: "beach-2",
    name: "My An Beach",
    lat: 16.043,
    lng: 108.247,
    category: "beach",
    subcategory: "swimming",
    description:
      "Expat favorite. Paradise Beach Bar outdoor cinema. Best sunset.",
    tags: ["sunset", "expat-favorite"],
    meta: {},
  },
  {
    id: "beach-3",
    name: "Non Nuoc Beach",
    lat: 16.01,
    lng: 108.265,
    category: "beach",
    subcategory: "surf",
    description: "Surf beach. Best waves Sep-Mar. T20 Surf School.",
    tags: ["surfing", "quiet"],
    meta: {},
  },
  {
    id: "beach-4",
    name: "Nam O Beach",
    lat: 16.11,
    lng: 108.135,
    category: "beach",
    subcategory: "swimming",
    description: "Fishing beach, snorkeling, boat trips.",
    tags: ["snorkeling", "local"],
    meta: {},
  },
  {
    id: "beach-5",
    name: "Tien Sa Beach",
    lat: 16.115,
    lng: 108.27,
    category: "beach",
    subcategory: "swimming",
    description: "Son Tra peninsula. Mountain backdrop, fewer crowds.",
    tags: ["scenic", "quiet"],
    meta: {},
  },

  // ── Healthcare ──────────────────────────────────────────────────────────
  {
    id: "healthcare-1",
    name: "Vinmec International Hospital",
    lat: 16.052,
    lng: 108.236,
    category: "healthcare",
    subcategory: "hospital",
    description:
      "Best in Da Nang. English staff. Consult 500-800K VND.",
    tags: ["recommended", "english-spoken"],
    meta: {},
    phone: "+84 236 3711 111",
  },
  {
    id: "healthcare-2",
    name: "Family Medical Practice",
    lat: 16.06,
    lng: 108.235,
    category: "healthcare",
    subcategory: "hospital",
    description: "Expat clinic. English spoken.",
    tags: ["english-spoken", "expat-friendly"],
    meta: {},
  },
  {
    id: "healthcare-3",
    name: "Pharmacity An Thuong",
    lat: 16.0465,
    lng: 108.242,
    category: "healthcare",
    subcategory: "pharmacy",
    description: "Chain pharmacy. Most prescription meds OTC.",
    tags: [],
    meta: {},
  },

  // ── Groceries ───────────────────────────────────────────────────────────
  {
    id: "grocery-1",
    name: "Lotte Mart",
    lat: 16.064,
    lng: 108.215,
    category: "grocery",
    subcategory: "supermarket",
    description: "Imported food section. City side.",
    hours: "8am-10pm",
    tags: [],
    meta: {},
  },
  {
    id: "grocery-2",
    name: "GO! BigC",
    lat: 16.058,
    lng: 108.21,
    category: "grocery",
    subcategory: "supermarket",
    description: "Large, good prices.",
    hours: "8am-10pm",
    tags: [],
    meta: {},
  },
  {
    id: "grocery-3",
    name: "Mega Market",
    lat: 16.07,
    lng: 108.205,
    category: "grocery",
    subcategory: "supermarket",
    description: "Wholesale-style bulk buying.",
    tags: [],
    meta: {},
  },
  {
    id: "grocery-4",
    name: "An Hai Dong Market",
    lat: 16.045,
    lng: 108.24,
    category: "grocery",
    subcategory: "market",
    description:
      "Near An Thuong. Freshest produce, cheapest. Zero English.",
    tags: ["local", "cheap"],
    meta: {},
  },
  {
    id: "grocery-5",
    name: "Han Market",
    lat: 16.068,
    lng: 108.224,
    category: "grocery",
    subcategory: "market",
    description: "Famous downtown market. Food, souvenirs.",
    tags: ["tourist-friendly"],
    meta: {},
  },

  // ── Coworking ───────────────────────────────────────────────────────────
  {
    id: "coworking-1",
    name: "Seaview Coworking",
    lat: 16.046,
    lng: 108.2435,
    category: "coworking",
    description: "Ocean views, social hub for remote workers.",
    tags: ["recommended", "ocean-view"],
    meta: { price: "$75/mo" },
  },
  {
    id: "coworking-2",
    name: "Enouvo Space",
    lat: 16.0475,
    lng: 108.2415,
    category: "coworking",
    description: "Modern, good community events.",
    tags: [],
    meta: { price: "$60-80/mo" },
  },
  {
    id: "coworking-3",
    name: "ACE Coworking",
    lat: 16.048,
    lng: 108.244,
    category: "coworking",
    tags: [],
    meta: { price: "$50-70/mo" },
  },
  {
    id: "coworking-4",
    name: "IoT Coworking",
    lat: 16.067,
    lng: 108.218,
    category: "coworking",
    description: "City side. Vietnamese tech community.",
    tags: [],
    meta: { price: "$40-60/mo" },
  },

  // ── Gyms ────────────────────────────────────────────────────────────────
  {
    id: "gym-1",
    name: "The Gym Da Nang",
    lat: 16.0468,
    lng: 108.243,
    category: "gym",
    description: "Popular expat gym An Thuong.",
    tags: [],
    meta: { price: "500K-800K VND/mo" },
  },
  {
    id: "gym-2",
    name: "California Fitness",
    lat: 16.065,
    lng: 108.22,
    category: "gym",
    description: "Chain downtown. Pool, classes.",
    tags: [],
    meta: { price: "800K-1.2M VND/mo" },
  },

  // ── Motorbike Rental ────────────────────────────────────────────────────
  {
    id: "motorbike-1",
    name: "Tigit Motorbikes",
    lat: 16.047,
    lng: 108.242,
    category: "motorbike",
    description:
      "Reputable. Well-maintained, fair contracts, insurance.",
    tags: ["recommended"],
    meta: {},
    url: "https://tigitmotorbikes.com",
  },
  {
    id: "motorbike-2",
    name: "Rentabike Vietnam",
    lat: 16.046,
    lng: 108.241,
    category: "motorbike",
    description: "Trusted. Clear contracts, no passport deposit.",
    tags: ["recommended"],
    meta: {},
    url: "https://rentabikevn.com",
  },

  // ── Day Trips ───────────────────────────────────────────────────────────
  {
    id: "daytrip-1",
    name: "Hoi An Ancient Town",
    lat: 15.8801,
    lng: 108.338,
    category: "daytrip",
    description:
      "UNESCO, 30 min Grab 150-200K VND. Lanterns, tailors, food.",
    tags: ["must-visit"],
    meta: {},
  },
  {
    id: "daytrip-2",
    name: "Marble Mountains",
    lat: 16.004,
    lng: 108.263,
    category: "daytrip",
    description:
      "5 limestone hills, pagodas, caves. 15 min south. 40K VND.",
    tags: ["must-visit"],
    meta: {},
  },
  {
    id: "daytrip-3",
    name: "Ba Na Hills / Golden Bridge",
    lat: 15.9977,
    lng: 107.9875,
    category: "daytrip",
    description:
      "Mountain resort, Golden Bridge. Cable car+entrance ~800K VND.",
    tags: ["tourist"],
    meta: {},
  },
  {
    id: "daytrip-4",
    name: "Hai Van Pass",
    lat: 16.18,
    lng: 108.13,
    category: "daytrip",
    description:
      "Iconic coastal road. 1hr north. Best by motorbike. Top Gear approved.",
    tags: ["must-visit", "motorbike"],
    meta: {},
  },
  {
    id: "daytrip-5",
    name: "Lady Buddha",
    lat: 16.1003,
    lng: 108.277,
    category: "daytrip",
    description:
      "67m statue, Son Tra peninsula. Free. Ocean views sunrise.",
    tags: ["free", "sunrise"],
    meta: {},
  },
  {
    id: "daytrip-6",
    name: "Cham Islands",
    lat: 15.953,
    lng: 108.517,
    category: "daytrip",
    description: "Ferry from Hoi An. Pristine beaches, snorkeling.",
    tags: ["snorkeling", "beach"],
    meta: {},
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getPOIsByCategory(category: POICategory): POI[] {
  return CURATED_POIS.filter((poi) => poi.category === category);
}

export function getPOILayer(id: POICategory): POILayer | undefined {
  return POI_LAYERS.find((layer) => layer.id === id);
}

/** Categories available for proximity filtering (exclude daytrip and restaurant) */
export const PROXIMITY_CATEGORIES: { id: POICategory; label: string }[] = [
  { id: "beach", label: "Beach" },
  { id: "atm", label: "ATM" },
  { id: "healthcare", label: "Healthcare" },
  { id: "grocery", label: "Grocery" },
  { id: "coworking", label: "Coworking" },
  { id: "gym", label: "Gym" },
  { id: "motorbike", label: "Motorbike" },
];

/** Haversine distance between two lat/lng points, in meters */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format distance for display: "350m" or "1.2km" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export interface NearbyCategory {
  category: POICategory;
  label: string;
  icon: string;
  color: string;
  pois: { poi: POI; distanceM: number }[];
}

/** Returns nearby POIs grouped by PROXIMITY_CATEGORIES, sorted by distance */
export function getNearbyPOIs(lat: number, lng: number): NearbyCategory[] {
  return PROXIMITY_CATEGORIES.map(({ id, label }) => {
    const layer = POI_LAYERS.find((l) => l.id === id)!;
    const pois = CURATED_POIS.filter((p) => p.category === id)
      .map((poi) => ({
        poi,
        distanceM: getDistanceMeters(lat, lng, poi.lat, poi.lng),
      }))
      .sort((a, b) => a.distanceM - b.distanceM);

    return {
      category: id,
      label,
      icon: layer.icon,
      color: layer.color,
      pois,
    };
  });
}

/** Returns deduplicated coordinates for all POIs matching the given categories */
export function getPOICoordinatesByCategories(
  categories: POICategory[]
): { lat: number; lng: number }[] {
  const seen = new Set<string>();
  const coords: { lat: number; lng: number }[] = [];
  for (const poi of CURATED_POIS) {
    if (poi.category === "daytrip") continue;
    if (!categories.includes(poi.category)) continue;
    const key = `${poi.lat},${poi.lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    coords.push({ lat: poi.lat, lng: poi.lng });
  }
  return coords;
}
