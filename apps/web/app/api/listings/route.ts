import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * Build filter conditions shared by both list and map_pins modes.
 * Queries v_properties view which serves canonical data when available,
 * falling back to raw listings for properties not yet canonicalized.
 */
function buildFilterConditions(params: URLSearchParams) {
  const conditions: string[] = ["l.is_active = true", "l.is_duplicate = false"];
  const values: any[] = [];
  let paramIndex = 1;

  // Area filter
  const areas = params.get("areas");
  if (areas) {
    const areaList = areas.split(",");
    conditions.push(
      `l.area_name IN (${areaList.map(() => `$${paramIndex++}`).join(",")})`
    );
    values.push(...areaList);
  }

  // Price range
  const priceMin = params.get("price_min");
  if (priceMin) {
    conditions.push(`l.price_vnd >= $${paramIndex++}`);
    values.push(parseInt(priceMin));
  }
  const priceMax = params.get("price_max");
  if (priceMax) {
    conditions.push(`l.price_vnd <= $${paramIndex++}`);
    values.push(parseInt(priceMax));
  }

  // Property type
  const propertyTypes = params.get("property_types");
  if (propertyTypes) {
    const types = propertyTypes.split(",");
    conditions.push(
      `l.property_type IN (${types.map(() => `$${paramIndex++}`).join(",")})`
    );
    values.push(...types);
  }

  // Bedrooms
  const bedrooms = params.get("bedrooms");
  if (bedrooms !== null && bedrooms !== "") {
    const br = parseInt(bedrooms);
    if (br >= 4) {
      conditions.push(`l.bedrooms >= $${paramIndex++}`);
      values.push(4);
    } else {
      conditions.push(`l.bedrooms = $${paramIndex++}`);
      values.push(br);
    }
  }

  // Posted within hours
  const postedWithin = params.get("posted_within_hours");
  if (postedWithin) {
    conditions.push(
      `l.first_seen_at >= NOW() - INTERVAL '${parseInt(postedWithin)} hours'`
    );
  }

  // Proximity to POIs
  const nearLatlngs = params.get("near_latlngs");
  const nearDistance = params.get("near_distance");
  if (nearLatlngs) {
    const distMeters = nearDistance ? parseInt(nearDistance) : 1000;
    const deltaLat = distMeters / 111320;
    const deltaLng = distMeters / (111320 * Math.cos((16 * Math.PI) / 180));
    const pairs = nearLatlngs.split(";").map((p) => {
      const [lat, lng] = p.split(",").map(Number);
      return { lat, lng };
    }).filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

    if (pairs.length > 0) {
      const orClauses = pairs.map((p) => {
        const latMin = `$${paramIndex++}`;
        const latMax = `$${paramIndex++}`;
        const lngMin = `$${paramIndex++}`;
        const lngMax = `$${paramIndex++}`;
        values.push(p.lat - deltaLat, p.lat + deltaLat, p.lng - deltaLng, p.lng + deltaLng);
        return `(l.latitude BETWEEN ${latMin} AND ${latMax} AND l.longitude BETWEEN ${lngMin} AND ${lngMax})`;
      });
      conditions.push(`(${orClauses.join(" OR ")})`);
    }
  }

  return { conditions, values, paramIndex };
}

export async function GET(request: NextRequest) {
  try {
  const params = request.nextUrl.searchParams;

  // ── Map pins mode: return all geo-located listings (no bounds, no pagination) ──
  if (params.get("map_pins") === "true") {
    const { conditions, values } = buildFilterConditions(params);
    conditions.push("l.latitude IS NOT NULL");
    conditions.push("l.longitude IS NOT NULL");
    const whereClause = conditions.join(" AND ");

    const pins = await query(
      `SELECT l.id, l.latitude, l.longitude, l.price_vnd, l.property_type, l.area_name, l.first_seen_at, l.thumbnail_url, l.title_en, l.title
       FROM v_properties l
       WHERE ${whereClause}`,
      values
    );

    return NextResponse.json({ pins }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // ── Standard list mode ──
  const { conditions, values, paramIndex: pi } = buildFilterConditions(params);
  let paramIndex = pi;

  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const perPage = Math.min(50, parseInt(params.get("per_page") || "20"));
  const offset = (page - 1) * perPage;

  // Map bounds (only for sidebar list, not map pins)
  const north = params.get("north");
  const south = params.get("south");
  const east = params.get("east");
  const west = params.get("west");
  if (north && south && east && west) {
    conditions.push(
      `l.latitude BETWEEN $${paramIndex++} AND $${paramIndex++}`
    );
    conditions.push(
      `l.longitude BETWEEN $${paramIndex++} AND $${paramIndex++}`
    );
    values.push(
      parseFloat(south),
      parseFloat(north),
      parseFloat(west),
      parseFloat(east)
    );
  }

  // Sort
  const sortBy = params.get("sort") || "newest";
  let orderClause = "l.first_seen_at DESC";
  if (sortBy === "price_asc") orderClause = "CASE WHEN l.price_vnd IS NULL OR l.price_vnd < 500000 THEN 1 ELSE 0 END, l.price_vnd ASC";
  if (sortBy === "price_desc") orderClause = "l.price_vnd DESC NULLS LAST";

  const whereClause = conditions.join(" AND ");

  // Count total
  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM v_properties l WHERE ${whereClause}`,
    values
  );

  // Fetch listings
  const listings = await query(
    `SELECT
      l.id, l.title, l.title_en, l.description_en,
      l.property_type, l.bedrooms, l.bathrooms, l.area_sqm,
      l.floor_number, l.furnished,
      l.price_vnd, l.price_usd, l.price_period,
      l.area_name, l.street_address, l.building_name,
      l.latitude, l.longitude,
      l.amenities, l.contact_phone,
      l.images, l.thumbnail_url,
      l.source_platform, l.source_url,
      l.is_verified, l.quality_score,
      l.first_seen_at, l.created_at,
      l.source_count
    FROM v_properties l
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...values, perPage, offset]
  );

  return NextResponse.json({
    listings,
    total: parseInt(countResult.total),
    page,
    per_page: perPage,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });
  } catch (e: any) {
    console.error("Listings API error:", e.message);
    return NextResponse.json(
      { listings: [], total: 0, page: 1, per_page: 20, error: "Database unavailable" },
      { status: 503 }
    );
  }
}
