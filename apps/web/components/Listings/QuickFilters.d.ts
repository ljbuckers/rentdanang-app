export interface Filters {
  propertyTypes: string[];
  priceMin: number;
  priceMax: number;
  bedrooms: number | null;
  postedWithinHours: number | null;
  nearPOIs: string[];
  nearDistance: number;
  sortBy: string;
  areas: string[];
}

export const DEFAULT_FILTERS: Filters = {
  propertyTypes: [],
  priceMin: 0,
  priceMax: 100000000,
  bedrooms: null,
  postedWithinHours: null,
  nearPOIs: [],
  nearDistance: 1000,
  sortBy: "newest",
  areas: [],
};
