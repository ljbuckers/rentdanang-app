-- Migration 009: AI extractions table + canonical properties system
-- Run: psql -U rentdanang -d rentdanang -f 009_ai_extractions_and_canonical.sql

BEGIN;

-- ============================================================
-- 1. AI Extractions — versioned AI extraction results per listing
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    model_used VARCHAR(50) NOT NULL,          -- 'claude-haiku-4-5', etc.
    prompt_version VARCHAR(20) NOT NULL,      -- 'v1.0', 'v1.1', etc.
    extracted_data JSONB NOT NULL,            -- the full extraction result
    confidence VARCHAR(10),                   -- 'high', 'medium', 'low'
    input_tokens INTEGER,
    output_tokens INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_extractions_listing ON ai_extractions (listing_id, created_at DESC);
CREATE INDEX idx_ai_extractions_version ON ai_extractions (prompt_version);
CREATE INDEX idx_ai_extractions_confidence ON ai_extractions (confidence);

-- ============================================================
-- 2. Canonical Properties — one record per physical property
-- ============================================================
CREATE TABLE IF NOT EXISTS canonical_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core fields (best value merged from all sources)
    bedrooms SMALLINT CHECK (bedrooms IS NULL OR (bedrooms >= 0 AND bedrooms <= 15)),
    bathrooms SMALLINT CHECK (bathrooms IS NULL OR (bathrooms >= 0 AND bathrooms <= 10)),
    area_sqm NUMERIC(8,2) CHECK (area_sqm IS NULL OR (area_sqm >= 5 AND area_sqm <= 2000)),
    price_vnd_monthly BIGINT CHECK (price_vnd_monthly IS NULL OR (price_vnd_monthly >= 500000 AND price_vnd_monthly <= 500000000)),
    property_type VARCHAR(50),
    furnished VARCHAR(20),
    floor_number SMALLINT,

    -- Location
    building_name VARCHAR(200),
    building_id INTEGER REFERENCES known_buildings(id),
    district VARCHAR(100),
    ward VARCHAR(100),
    street_address TEXT,
    area_name VARCHAR(100),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    location GEOGRAPHY(POINT, 4326),

    -- Enriched data (filled by AI)
    amenities JSONB DEFAULT '[]',
    ai_description_en TEXT,
    ai_description_vi TEXT,
    ai_description_ko TEXT,
    ai_description_zh TEXT,
    ai_description_ja TEXT,
    ai_description_ru TEXT,
    quality_tier VARCHAR(20),              -- 'luxury', 'mid-range', 'basic'
    view_type VARCHAR(50),                 -- 'ocean', 'river', 'city', 'garden'

    -- Meta
    confidence_score NUMERIC(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    source_count INTEGER DEFAULT 1,        -- how many source listings feed this
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canonical_active ON canonical_properties (is_active) WHERE is_active = true;
CREATE INDEX idx_canonical_building ON canonical_properties (building_name) WHERE building_name IS NOT NULL;
CREATE INDEX idx_canonical_area ON canonical_properties (area_name);
CREATE INDEX idx_canonical_type_beds ON canonical_properties (property_type, bedrooms) WHERE is_active = true;
CREATE INDEX idx_canonical_location ON canonical_properties USING GIST (location);

-- Trigger for updated_at
CREATE TRIGGER canonical_updated_at BEFORE UPDATE ON canonical_properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Canonical Sources — links raw listings to canonical properties
-- ============================================================
CREATE TABLE IF NOT EXISTS canonical_sources (
    canonical_id UUID NOT NULL REFERENCES canonical_properties(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    source_platform VARCHAR(50) NOT NULL,
    match_score NUMERIC(5,2),              -- confidence of the match (0-100)
    match_method VARCHAR(50),              -- 'building+beds+price', 'image_embedding', 'phone', 'manual'
    field_contributions JSONB,             -- which fields came from this source
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (canonical_id, listing_id)
);

CREATE INDEX idx_canonical_sources_listing ON canonical_sources (listing_id);

-- ============================================================
-- 4. Listing flags — automated anomaly detection
-- ============================================================
CREATE TABLE IF NOT EXISTS listing_flags (
    id BIGSERIAL PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL,        -- 'price_outlier_low', 'bedroom_invalid', etc.
    severity VARCHAR(10) DEFAULT 'warning', -- 'warning', 'critical'
    details JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listing_flags_listing ON listing_flags (listing_id);
CREATE INDEX idx_listing_flags_unresolved ON listing_flags (flag_type) WHERE resolved = false;

-- ============================================================
-- 5. Add CHECK constraints to listings table (clean up first)
-- ============================================================

-- These should already be cleaned by previous fixes, but just in case:
UPDATE listings SET bedrooms = NULL WHERE bedrooms IS NOT NULL AND (bedrooms < 0 OR bedrooms > 15);
UPDATE listings SET bathrooms = NULL WHERE bathrooms IS NOT NULL AND (bathrooms < 0 OR bathrooms > 10);
UPDATE listings SET area_sqm = NULL WHERE area_sqm IS NOT NULL AND (area_sqm < 5 OR area_sqm > 2000);
UPDATE listings SET floor_number = NULL WHERE floor_number IS NOT NULL AND (floor_number < 0 OR floor_number > 100);

-- Now add constraints to prevent future corruption
-- PG16 doesn't support ADD CONSTRAINT IF NOT EXISTS; safe since constraints don't exist yet
ALTER TABLE listings ADD CONSTRAINT check_bedrooms
    CHECK (bedrooms IS NULL OR (bedrooms >= 0 AND bedrooms <= 15));
ALTER TABLE listings ADD CONSTRAINT check_bathrooms
    CHECK (bathrooms IS NULL OR (bathrooms >= 0 AND bathrooms <= 10));
ALTER TABLE listings ADD CONSTRAINT check_area_sqm
    CHECK (area_sqm IS NULL OR (area_sqm >= 5 AND area_sqm <= 2000));
ALTER TABLE listings ADD CONSTRAINT check_floor_number
    CHECK (floor_number IS NULL OR (floor_number >= 0 AND floor_number <= 100));

COMMIT;
