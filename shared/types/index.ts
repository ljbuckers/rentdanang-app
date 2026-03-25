// =============================================================
// RentDaNang Shared Types
// =============================================================

export type SourcePlatform =
  | "facebook"
  | "airbnb"
  | "chotot"
  | "batdongsan"
  | "dotproperty"
  | "fazwaz"
  | "agency"
  | "telegram";

export type PropertyType =
  | "apartment"
  | "house"
  | "villa"
  | "studio"
  | "room";

export type FurnishedStatus = "furnished" | "unfurnished" | "semi-furnished";

export type PricePeriod = "month" | "day" | "year";

export type AlertFrequency = "instant" | "daily" | "weekly";

export type UserRole = "user" | "agent" | "admin";

export type NotificationChannel = "email" | "sms" | "whatsapp";

export type ScrapeJobStatus = "pending" | "running" | "completed" | "failed";

export interface Listing {
  id: string;
  source_platform: SourcePlatform;
  source_url: string | null;
  source_id: string | null;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  property_type: PropertyType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  floor_number: number | null;
  total_floors: number | null;
  furnished: FurnishedStatus | null;
  price_vnd: number | null;
  price_usd: number | null;
  price_period: PricePeriod;
  deposit_months: number | null;
  utilities_included: boolean;
  area_name: string | null;
  district: string | null;
  ward: string | null;
  street_address: string | null;
  building_name: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  contact_name: string | null;
  contact_phone: string | null;
  contact_type: string | null;
  images: string[];
  thumbnail_url: string | null;
  min_lease_months: number | null;
  max_lease_months: number | null;
  available_from: string | null;
  pets_allowed: boolean | null;
  is_active: boolean;
  is_verified: boolean;
  is_duplicate: boolean;
  duplicate_of: string | null;
  quality_score: number | null;
  scraped_at: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: number;
  name: string;
  name_vn: string | null;
  slug: string;
  district: string | null;
  description: string | null;
  description_en: string | null;
  center_lat: number;
  center_lon: number;
  avg_price_1br: number | null;
  avg_price_2br: number | null;
  lifestyle_tags: string[];
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  auth_provider: string | null;
  role: UserRole;
  language_preference: string;
  phone: string | null;
  phone_verified: boolean;
  whatsapp_enabled: boolean;
  email_verified: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string | null;
  filters: ListingFilters;
  alert_enabled: boolean;
  alert_frequency: AlertFrequency;
  notify_email: boolean;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  last_alerted_at: string | null;
  created_at: string;
}

export interface SavedSearchCreate {
  name: string;
  filters: ListingFilters;
  alert_enabled?: boolean;
  alert_frequency?: AlertFrequency;
  notify_email?: boolean;
  notify_sms?: boolean;
  notify_whatsapp?: boolean;
}

export interface SavedSearchUpdate extends Partial<SavedSearchCreate> {}

export interface ListingFilters {
  area_names?: string[];
  price_min_vnd?: number;
  price_max_vnd?: number;
  property_types?: PropertyType[];
  bedrooms_min?: number;
  bedrooms_max?: number;
  furnished?: FurnishedStatus[];
  amenities?: string[];
  source_platforms?: SourcePlatform[];
  posted_within_hours?: number;
  pets_allowed?: boolean;
  has_images?: boolean;
}

export interface ScrapeJob {
  id: string;
  source_platform: SourcePlatform;
  source_url: string | null;
  status: ScrapeJobStatus;
  listings_found: number;
  listings_new: number;
  listings_updated: number;
  listings_duplicates: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface ListingSearchResult {
  listings: Listing[];
  total: number;
  page: number;
  per_page: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  price_vnd: number | null;
  property_type: PropertyType | null;
  first_seen_at: string;
}
