-- Add deactivated_at, price_history, and miss_count to listings
-- Listings are never deleted — deactivated_at marks when a listing disappeared from source
-- miss_count tracks consecutive scrape misses; at 3 the listing is deactivated

ALTER TABLE listings ADD COLUMN deactivated_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN price_history JSONB DEFAULT '[]';
ALTER TABLE listings ADD COLUMN miss_count SMALLINT DEFAULT 0;

-- Index for analytics queries on deactivated listings
CREATE INDEX idx_listings_deactivated ON listings (deactivated_at) WHERE deactivated_at IS NOT NULL;
