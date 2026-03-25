import { API_BASE_URL, LISTING_PAGE_SIZE } from '../constants';

export interface Listing {
  id: string;
  title: string | null;
  title_en: string | null;
  description_en: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  floor_number: number | null;
  furnished: string | null;
  price_vnd: number | null;
  price_usd: number | null;
  price_period: string;
  area_name: string | null;
  street_address: string | null;
  building_name: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  contact_phone: string | null;
  images: string[];
  thumbnail_url: string | null;
  source_platform: string;
  source_url: string | null;
  is_verified: boolean;
  quality_score: number | null;
  first_seen_at: string;
  created_at: string;
  source_count: number;
}

export interface Area {
  id: number;
  name: string;
  name_vn: string | null;
  district: string | null;
  description: string | null;
  description_en: string | null;
  center_lat: number;
  center_lon: number;
  avg_price_1br: number | null;
  avg_price_2br: number | null;
  lifestyle_tags: string[];
  listing_count: number;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  per_page: number;
}

export interface AreasResponse {
  areas: Area[];
}

export interface ListingFilters {
  areas?: string;
  price_min?: number;
  price_max?: number;
  property_types?: string;
  bedrooms?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  per_page?: number;
}

async function apiFetch<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getListings(filters?: ListingFilters): Promise<ListingsResponse> {
  return apiFetch<ListingsResponse>('/listings', {
    areas: filters?.areas,
    price_min: filters?.price_min,
    price_max: filters?.price_max,
    property_types: filters?.property_types,
    bedrooms: filters?.bedrooms,
    sort: filters?.sort,
    page: filters?.page || 1,
    per_page: filters?.per_page || LISTING_PAGE_SIZE,
  });
}

export async function getListingById(id: string): Promise<Listing | null> {
  // The web API returns listings in a list format, so we filter by page
  // For single listing, we fetch from the listings endpoint
  const result = await apiFetch<ListingsResponse>('/listings', {
    per_page: 1,
    page: 1,
  });
  // For now, fetch all and find; ideally add a /listings/:id route
  // Workaround: use the listing list and match by ID from cached data
  return result.listings.find(l => l.id === id) || null;
}

export async function getAreas(): Promise<Area[]> {
  const result = await apiFetch<AreasResponse>('/areas');
  return result.areas;
}

export async function getStats(): Promise<{ totalListings: number; avgPrice: number }> {
  try {
    const result = await apiFetch<ListingsResponse>('/listings', { per_page: 1 });
    return {
      totalListings: result.total,
      avgPrice: 0,
    };
  } catch {
    return { totalListings: 0, avgPrice: 0 };
  }
}
