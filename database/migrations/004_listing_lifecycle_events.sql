-- Listing lifecycle events, status enrichment, and market snapshots
-- Tracks state changes with reasons for trend analysis

-- =============================================================
-- LISTING EVENTS (audit trail for every state change)
-- =============================================================
CREATE TABLE listing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    event_type VARCHAR(30) NOT NULL,   -- 'activated', 'deactivated', 'price_changed', 'reactivated'
    reason VARCHAR(50),                -- 'source_404', 'source_redirect', 'miss_threshold', 'expired', 'manual'
    old_value JSONB,                   -- e.g. {"price_vnd": 8000000}
    new_value JSONB,                   -- e.g. {"price_vnd": 9000000}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listing_events_listing ON listing_events (listing_id, created_at DESC);
CREATE INDEX idx_listing_events_type ON listing_events (event_type, created_at DESC);

-- =============================================================
-- LISTING STATUS (richer than boolean is_active)
-- =============================================================
ALTER TABLE listings ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Backfill from existing is_active flag
UPDATE listings SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;

-- =============================================================
-- MARKET SNAPSHOTS (daily aggregation for trends)
-- =============================================================
CREATE TABLE market_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    area_name VARCHAR(100),            -- NULL = city-wide
    property_type VARCHAR(50),         -- NULL = all types
    active_listings INTEGER,
    new_listings INTEGER,              -- new that day
    deactivated_listings INTEGER,      -- left that day
    avg_price_vnd BIGINT,
    median_price_vnd BIGINT,
    min_price_vnd BIGINT,
    max_price_vnd BIGINT,
    avg_price_per_sqm BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use COALESCE so NULLs (meaning "all") are treated as equal for uniqueness
CREATE UNIQUE INDEX idx_snapshots_unique ON market_snapshots (
    snapshot_date,
    COALESCE(area_name, ''),
    COALESCE(property_type, '')
);
CREATE INDEX idx_snapshots_date ON market_snapshots (snapshot_date DESC);
