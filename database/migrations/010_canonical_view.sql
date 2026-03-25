-- Migration 010: View that unifies canonical properties with source listing data
-- The frontend queries this view instead of the listings table directly.
-- When canonical_properties is populated, it serves merged/cleaned data.
-- When empty, it falls back to raw listings (zero downtime during transition).
--
-- Run: psql -U rentdanang -d rentdanang -f 010_canonical_view.sql

BEGIN;

-- ============================================================
-- 1. v_properties — the frontend's single source of truth
-- ============================================================
-- Joins canonical properties with their "best" source listing to
-- get images, titles, descriptions, contact info, and source attribution
-- that only exist on raw listings.

CREATE OR REPLACE VIEW v_properties AS

-- Branch A: canonical properties exist — use them with source listing enrichment
SELECT
    cp.id,

    -- Titles: from best source listing
    best.title,
    COALESCE(cp.ai_description_en, best.title_en) AS title_en,
    best.description,
    COALESCE(cp.ai_description_en, best.description_en) AS description_en,

    -- Core fields from canonical (merged + cleaned)
    cp.property_type,
    cp.bedrooms,
    cp.bathrooms,
    cp.area_sqm,
    cp.floor_number,
    cp.furnished,

    -- Price: canonical uses price_vnd_monthly, frontend expects price_vnd
    cp.price_vnd_monthly AS price_vnd,
    CASE WHEN cp.price_vnd_monthly IS NOT NULL
         THEN ROUND(cp.price_vnd_monthly / 25500.0, 2)
         ELSE NULL
    END AS price_usd,
    'month'::text AS price_period,

    -- Location from canonical
    cp.area_name,
    cp.street_address,
    cp.building_name,
    cp.latitude,
    cp.longitude,
    cp.location,

    -- Media from best source listing
    cp.amenities,
    best.contact_name,
    best.contact_phone,
    best.images,
    best.thumbnail_url,

    -- Source attribution (best source)
    best.source_platform,
    best.source_url,

    -- Meta
    false AS is_duplicate,
    true AS is_active,
    CASE WHEN cp.confidence_score >= 0.7 THEN true ELSE false END AS is_verified,
    cp.confidence_score AS quality_score,
    cp.first_seen_at,
    cp.last_seen_at,
    cp.created_at,
    cp.updated_at,

    -- Canonical extras (available for detail page enrichment)
    cp.source_count,
    cp.confidence_score,
    cp.quality_tier,
    cp.district,
    cp.ward,
    cp.ai_description_vi,
    cp.ai_description_ko,
    cp.ai_description_zh,
    cp.ai_description_ja,
    cp.ai_description_ru,
    cp.building_id,
    cp.view_type

FROM canonical_properties cp

-- Join the "best" source listing (highest reliability platform)
LEFT JOIN LATERAL (
    SELECT
        l.title, l.title_en, l.description, l.description_en,
        l.contact_name, l.contact_phone,
        l.images, l.thumbnail_url,
        l.source_platform, l.source_url,
        l.source_id
    FROM canonical_sources cs
    JOIN listings l ON l.id = cs.listing_id
    WHERE cs.canonical_id = cp.id
    ORDER BY
        CASE l.source_platform
            WHEN 'fazwaz' THEN 1
            WHEN 'dotproperty' THEN 2
            WHEN 'batdongsan' THEN 3
            WHEN 'chotot' THEN 4
            WHEN 'facebook' THEN 5
            ELSE 6
        END,
        l.quality_score DESC NULLS LAST,
        l.created_at DESC
    LIMIT 1
) best ON true

WHERE cp.is_active = true

UNION ALL

-- Branch B: listings NOT yet in any canonical property — serve raw
SELECT
    l.id,
    l.title,
    l.title_en,
    l.description,
    l.description_en,
    l.property_type,
    l.bedrooms,
    l.bathrooms,
    l.area_sqm,
    l.floor_number,
    l.furnished,
    l.price_vnd,
    l.price_usd,
    l.price_period,
    l.area_name,
    l.street_address,
    l.building_name,
    l.latitude,
    l.longitude,
    l.location,
    l.amenities,
    l.contact_name,
    l.contact_phone,
    l.images,
    l.thumbnail_url,
    l.source_platform,
    l.source_url,
    l.is_duplicate,
    l.is_active,
    l.is_verified,
    l.quality_score,
    l.first_seen_at,
    l.last_seen_at,
    l.created_at,
    l.updated_at,
    -- Canonical extras (null for raw listings)
    1 AS source_count,
    l.quality_score AS confidence_score,
    NULL::varchar AS quality_tier,
    l.district,
    l.ward,
    NULL::text AS ai_description_vi,
    NULL::text AS ai_description_ko,
    NULL::text AS ai_description_zh,
    NULL::text AS ai_description_ja,
    NULL::text AS ai_description_ru,
    NULL::integer AS building_id,
    NULL::varchar AS view_type

FROM listings l
WHERE l.is_active = true
  AND l.is_duplicate = false
  AND NOT EXISTS (SELECT 1 FROM canonical_sources cs WHERE cs.listing_id = l.id);


-- ============================================================
-- 2. v_property_sources — for detail page "Also listed on" section
-- ============================================================
CREATE OR REPLACE VIEW v_property_sources AS
SELECT
    cs.canonical_id AS property_id,
    l.id AS listing_id,
    l.source_platform,
    l.source_url,
    l.price_vnd,
    l.title_en,
    l.thumbnail_url,
    l.images,
    l.contact_name,
    l.contact_phone,
    l.first_seen_at,
    cs.match_score,
    cs.match_method,
    cs.field_contributions
FROM canonical_sources cs
JOIN listings l ON l.id = cs.listing_id
WHERE l.is_active = true;


COMMIT;
