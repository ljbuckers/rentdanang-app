import { query, queryOne } from "@/lib/db";
import { AREA_BOUNDARIES } from "@/lib/area-boundaries";

export interface AreaStats {
  listingCount: number;
  avgPriceVnd: number;
  avgPriceUsd: number;
  minPriceUsd: number;
  maxPriceUsd: number;
  topListings: any[];
}

export async function getAreaStats(slug: string): Promise<AreaStats> {
  let whereClause = "";
  let params: any[] = [];

  // Handle special cases
  if (slug === 'thanh-khe') {
    whereClause = "(street_address ILIKE '%Thanh Khe%' OR description ILIKE '%Thanh Khe%')";
  } else if (slug === 'lien-chieu') {
    whereClause = "(street_address ILIKE '%Lien Chieu%' OR area_name ILIKE '%Lien Chieu%')";
  } else {
    // Find area name from boundaries
    const area = AREA_BOUNDARIES.find(a => a.slug === slug);
    if (area) {
      whereClause = "area_name = $1";
      params = [area.name];
    } else {
      // Fallback
      whereClause = "area_name ILIKE $1";
      params = [`%${slug.replace('-', ' ')}%`];
    }
  }

  // 1. Aggregates
  // Using CAST to numeric for safe AVG
  const statsQuery = `
    SELECT 
      COUNT(*) as count,
      AVG(price_vnd) as avg_vnd,
      AVG(price_usd) as avg_usd,
      MIN(price_usd) as min_usd,
      MAX(price_usd) as max_usd
    FROM v_properties
    WHERE is_active = true AND ${whereClause}
  `;
  
  const stats = await queryOne(statsQuery, params);

  // 2. Top Listings
  const listingsQuery = `
    SELECT 
      id, 
      COALESCE(title_en, title) as title, 
      price_usd, price_vnd,
      bedrooms, bathrooms, area_sqm, 
      thumbnail_url, street_address
    FROM v_properties
    WHERE is_active = true AND ${whereClause}
    ORDER BY quality_score DESC, last_seen_at DESC
    LIMIT 6
  `;
  
  const topListings = await query(listingsQuery, params);

  return {
    listingCount: parseInt(stats?.count || "0"),
    avgPriceVnd: Math.round(parseFloat(stats?.avg_vnd || "0")),
    avgPriceUsd: Math.round(parseFloat(stats?.avg_usd || "0")),
    minPriceUsd: Math.round(parseFloat(stats?.min_usd || "0")),
    maxPriceUsd: Math.round(parseFloat(stats?.max_usd || "0")),
    topListings: topListings.map(l => ({
      ...l,
      href: `/listings/${l.id}`
    }))
  };
}

export interface BedroomPricing {
  bedrooms: number;
  label: string;
  count: number;
  medianUsd: number;
  avgUsd: number;
  minUsd: number;
  maxUsd: number;
  medianVnd: number;
  minVnd: number;
  maxVnd: number;
}

export interface PropertyTypeCount {
  type: string;
  count: number;
}

export interface AreaMarketData {
  bedroomPricing: BedroomPricing[];
  propertyTypes: PropertyTypeCount[];
  totalActive: number;
  avgDaysOnMarket: number;
  newThisWeek: number;
}

const BEDROOM_LABELS: Record<number, string> = {
  0: "Studio",
  1: "1 Bedroom",
  2: "2 Bedrooms",
  3: "3+ Bedrooms",
};

export async function getAreaMarketData(slug: string): Promise<AreaMarketData> {
  let whereClause = "";
  let params: any[] = [];

  if (slug === 'thanh-khe') {
    whereClause = "(street_address ILIKE '%Thanh Khe%' OR description ILIKE '%Thanh Khe%')";
  } else if (slug === 'lien-chieu') {
    whereClause = "(street_address ILIKE '%Lien Chieu%' OR area_name ILIKE '%Lien Chieu%')";
  } else {
    const area = AREA_BOUNDARIES.find(a => a.slug === slug);
    if (area) {
      whereClause = "area_name = $1";
      params = [area.name];
    } else {
      whereClause = "area_name ILIKE $1";
      params = [`%${slug.replace('-', ' ')}%`];
    }
  }

  // Bedroom pricing breakdown
  const bedroomQuery = `
    SELECT 
      CASE WHEN bedrooms >= 3 THEN 3 ELSE COALESCE(bedrooms, 0) END as br,
      COUNT(*) as count,
      ROUND(AVG(price_usd)) as avg_usd,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_usd)) as median_usd,
      ROUND(MIN(price_usd)) as min_usd,
      ROUND(MAX(price_usd)) as max_usd,
      ROUND(AVG(price_vnd)) as avg_vnd,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_vnd)) as median_vnd,
      ROUND(MIN(price_vnd)) as min_vnd,
      ROUND(MAX(price_vnd)) as max_vnd
    FROM v_properties
    WHERE is_active = true AND price_usd > 0 AND price_usd < 10000
      AND ${whereClause}
    GROUP BY 1
    ORDER BY 1
  `;
  const bedroomRows = await query(bedroomQuery, params);

  // Property type breakdown
  const typeQuery = `
    SELECT property_type as type, COUNT(*) as count
    FROM v_properties
    WHERE is_active = true AND property_type IS NOT NULL AND ${whereClause}
    GROUP BY property_type
    ORDER BY count DESC
  `;
  const typeRows = await query(typeQuery, params);

  // Market dynamics
  const dynamicsQuery = `
    SELECT 
      COUNT(*) as total_active,
      ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(last_seen_at, NOW()) - first_seen_at)) / 86400)) as avg_days,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week
    FROM v_properties
    WHERE is_active = true AND ${whereClause}
  `;
  const dynamics = await queryOne(dynamicsQuery, params);

  return {
    bedroomPricing: bedroomRows.map((r: any) => ({
      bedrooms: parseInt(r.br),
      label: BEDROOM_LABELS[parseInt(r.br)] || `${r.br} Bed`,
      count: parseInt(r.count),
      medianUsd: Math.round(parseFloat(r.median_usd || "0")),
      avgUsd: Math.round(parseFloat(r.avg_usd || "0")),
      minUsd: Math.round(parseFloat(r.min_usd || "0")),
      maxUsd: Math.round(parseFloat(r.max_usd || "0")),
      medianVnd: Math.round(parseFloat(r.median_vnd || "0")),
      minVnd: Math.round(parseFloat(r.min_vnd || "0")),
      maxVnd: Math.round(parseFloat(r.max_vnd || "0")),
    })),
    propertyTypes: typeRows.map((r: any) => ({
      type: r.type,
      count: parseInt(r.count),
    })),
    totalActive: parseInt(dynamics?.total_active || "0"),
    avgDaysOnMarket: Math.round(parseFloat(dynamics?.avg_days || "0")),
    newThisWeek: parseInt(dynamics?.new_this_week || "0"),
  };
}
