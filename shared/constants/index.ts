// =============================================================
// RentDaNang Shared Constants
// =============================================================

export const VND_USD_RATE = 25500;

export const AREA_SLUGS = [
  "an-thuong",
  "son-tra",
  "hai-chau",
  "ngu-hanh-son",
  "lien-chieu",
] as const;

export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "villa",
  "studio",
  "room",
] as const;

export const FURNISHED_OPTIONS = [
  "furnished",
  "semi-furnished",
  "unfurnished",
] as const;

export const SOURCE_PLATFORMS = [
  "facebook",
  "airbnb",
  "chotot",
  "batdongsan",
  "dotproperty",
  "fazwaz",
  "agency",
  "telegram",
] as const;

export const AMENITIES = [
  "swimming_pool",
  "gym",
  "balcony",
  "ocean_view",
  "river_view",
  "parking",
  "elevator",
  "washing_machine",
  "kitchen",
  "air_conditioning",
  "water_heater",
  "wifi",
  "cleaning_service",
  "24h_security",
  "pet_friendly",
] as const;

export const AMENITY_LABELS: Record<string, string> = {
  swimming_pool: "Swimming Pool",
  gym: "Gym",
  balcony: "Balcony",
  ocean_view: "Ocean View",
  river_view: "River View",
  parking: "Parking",
  elevator: "Elevator",
  washing_machine: "Washing Machine",
  kitchen: "Kitchen",
  air_conditioning: "Air Conditioning",
  water_heater: "Water Heater",
  wifi: "WiFi",
  cleaning_service: "Cleaning Service",
  "24h_security": "24h Security",
  pet_friendly: "Pet Friendly",
};

// Vietnamese amenity name → English key mapping
export const AMENITY_VN_MAP: Record<string, string> = {
  "hồ bơi": "swimming_pool",
  "phòng gym": "gym",
  "ban công": "balcony",
  "view biển": "ocean_view",
  "view sông": "river_view",
  "bãi đỗ xe": "parking",
  "thang máy": "elevator",
  "máy giặt": "washing_machine",
  "bếp": "kitchen",
  "điều hòa": "air_conditioning",
  "nóng lạnh": "water_heater",
  wifi: "wifi",
  "dọn phòng": "cleaning_service",
  "an ninh 24/7": "24h_security",
  "cho nuôi thú": "pet_friendly",
};

// Color scheme
export const COLORS = {
  primary: "#0077B6",
  primaryDark: "#005A8C",
  primaryLight: "#00A5E0",
  accent: "#FF6B6B",
  accentDark: "#E05555",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
} as const;

// Map defaults
export const MAP_CENTER = {
  lat: 16.06,
  lng: 108.22,
} as const;

export const MAP_DEFAULT_ZOOM = 12;

// Source platform display names and colors
export const SOURCE_DISPLAY: Record<string, { label: string; color: string }> =
  {
    facebook: { label: "Facebook", color: "#1877F2" },
    airbnb: { label: "Airbnb", color: "#FF5A5F" },
    chotot: { label: "Cho Tot", color: "#FFBA00" },
    batdongsan: { label: "Batdongsan", color: "#E03C31" },
    dotproperty: { label: "Dot Property", color: "#00B14F" },
    fazwaz: { label: "FazWaz", color: "#FF6600" },
    agency: { label: "Agency", color: "#6366F1" },
    telegram: { label: "Telegram", color: "#26A5E4" },
  };
