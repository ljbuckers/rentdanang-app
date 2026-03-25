-- RentDaNang Initial Schema
-- PostgreSQL 16 + PostGIS 3.4

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- LISTINGS (core table)
-- =============================================================
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tracking
    source_platform VARCHAR(50) NOT NULL,
    source_url TEXT,
    source_id VARCHAR(255),
    source_raw_data JSONB,

    -- Core listing data
    title TEXT,
    title_en TEXT,
    description TEXT,
    description_en TEXT,

    -- Property details
    property_type VARCHAR(50),
    bedrooms SMALLINT,
    bathrooms SMALLINT,
    area_sqm DECIMAL(8,2),
    floor_number SMALLINT,
    total_floors SMALLINT,
    furnished VARCHAR(20),

    -- Pricing
    price_vnd BIGINT,
    price_usd DECIMAL(10,2),
    price_period VARCHAR(20) DEFAULT 'month',
    deposit_months SMALLINT,
    utilities_included BOOLEAN DEFAULT false,

    -- Location
    area_name VARCHAR(100),
    district VARCHAR(100),
    ward VARCHAR(100),
    street_address TEXT,
    building_name VARCHAR(200),
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    -- Amenities
    amenities JSONB DEFAULT '[]',

    -- Contact
    contact_name VARCHAR(200),
    contact_phone VARCHAR(50),
    contact_type VARCHAR(50),

    -- Images
    images JSONB DEFAULT '[]',
    thumbnail_url TEXT,

    -- Lease details
    min_lease_months SMALLINT,
    max_lease_months SMALLINT,
    available_from DATE,
    pets_allowed BOOLEAN,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of UUID REFERENCES listings(id),
    quality_score DECIMAL(3,2),

    -- Timestamps
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listings indexes
CREATE INDEX idx_listings_location ON listings USING GIST (location);
CREATE INDEX idx_listings_active ON listings (is_active) WHERE is_active = true;
CREATE INDEX idx_listings_source ON listings (source_platform, source_id);
CREATE INDEX idx_listings_area ON listings (area_name);
CREATE INDEX idx_listings_price ON listings (price_vnd) WHERE is_active = true;
CREATE INDEX idx_listings_type ON listings (property_type) WHERE is_active = true;
CREATE INDEX idx_listings_bedrooms ON listings (bedrooms) WHERE is_active = true;
CREATE INDEX idx_listings_created ON listings (created_at DESC);
CREATE INDEX idx_listings_contact_phone ON listings (contact_phone) WHERE contact_phone IS NOT NULL;

-- =============================================================
-- AREAS / NEIGHBORHOODS
-- =============================================================
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_vn VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    district VARCHAR(100),
    description TEXT,
    description_en TEXT,
    boundary GEOGRAPHY(POLYGON, 4326),
    center_lat DECIMAL(10, 7),
    center_lon DECIMAL(10, 7),
    avg_price_1br BIGINT,
    avg_price_2br BIGINT,
    lifestyle_tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_areas_slug ON areas (slug);
CREATE INDEX idx_areas_boundary ON areas USING GIST (boundary);

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(200),
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50),
    auth_provider_id VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    language_preference VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_auth ON users (auth_provider, auth_provider_id);

-- =============================================================
-- SAVED SEARCHES / ALERTS
-- =============================================================
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200),
    filters JSONB NOT NULL,
    alert_enabled BOOLEAN DEFAULT true,
    alert_frequency VARCHAR(20) DEFAULT 'instant',
    last_alerted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON saved_searches (user_id);
CREATE INDEX idx_saved_searches_alerts ON saved_searches (alert_enabled) WHERE alert_enabled = true;

-- =============================================================
-- FAVORITES
-- =============================================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_favorites_user ON favorites (user_id);

-- =============================================================
-- SCRAPE JOBS (health monitoring)
-- =============================================================
CREATE TABLE scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_platform VARCHAR(50) NOT NULL,
    source_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    listings_found INTEGER DEFAULT 0,
    listings_new INTEGER DEFAULT 0,
    listings_updated INTEGER DEFAULT 0,
    listings_duplicates INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrape_jobs_platform ON scrape_jobs (source_platform, created_at DESC);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs (status);

-- =============================================================
-- AGENTS (Phase 3 - direct posting)
-- =============================================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_name VARCHAR(200),
    phone VARCHAR(50),
    zalo_id VARCHAR(100),
    whatsapp VARCHAR(50),
    telegram VARCHAR(100),
    languages JSONB DEFAULT '["vi"]',
    areas_served JSONB DEFAULT '[]',
    is_verified BOOLEAN DEFAULT false,
    listing_count INTEGER DEFAULT 0,
    avg_response_time_hours DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- KNOWN BUILDINGS (for NLP extraction matching)
-- =============================================================
CREATE TABLE known_buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    name_vn VARCHAR(200),
    aliases JSONB DEFAULT '[]',
    area_name VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_known_buildings_name ON known_buildings (name);

-- =============================================================
-- IMAGE HASHES (for deduplication)
-- =============================================================
CREATE TABLE image_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    r2_url TEXT,
    phash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_image_hashes_listing ON image_hashes (listing_id);
CREATE INDEX idx_image_hashes_phash ON image_hashes (phash);

-- =============================================================
-- UPDATED_AT TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
