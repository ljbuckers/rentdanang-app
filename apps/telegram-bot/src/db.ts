import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang",
});

export default pool;

export interface SavedSearch {
  id: string;
  telegram_chat_id: number;
  filters: {
    areas?: string[];
    min_price_usd?: number;
    max_price_usd?: number;
    bedrooms?: number | null;
    property_type?: string | null;
  };
  last_alert_listing_time: string;
}

export interface NewListing {
  id: string;
  title_en: string | null;
  title: string;
  area_name: string | null;
  district: string | null;
  price_usd: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  source_url: string;
  first_seen_at: string;
}
