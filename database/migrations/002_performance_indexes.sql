-- Performance indexes for RentDaNang
-- Run: sudo -u postgres psql rentdanang < 002_performance_indexes.sql

-- Index for common area + price range searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_area_price
  ON v_properties(area, price_vnd)
  WHERE is_active = true AND is_duplicate = false;

-- Index for property type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_type_active
  ON v_properties(property_type, is_active)
  WHERE is_duplicate = false;

-- Index for bedroom filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_bedrooms
  ON v_properties(bedrooms, price_vnd)
  WHERE is_active = true AND is_duplicate = false;

-- Index for newest listings (default sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_first_seen
  ON v_properties(first_seen_at DESC)
  WHERE is_active = true AND is_duplicate = false;

-- Index for price sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_price
  ON v_properties(price_vnd ASC)
  WHERE is_active = true AND is_duplicate = false;

-- PostGIS spatial index for map queries (if not exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_location
  ON v_properties USING GIST(location)
  WHERE is_active = true AND is_duplicate = false;

-- Full text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_fts
  ON v_properties USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')))
  WHERE is_active = true;

-- Composite for the most common query pattern: active + not duplicate + area
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_active_area
  ON v_properties(is_active, is_duplicate, area, price_vnd, first_seen_at DESC);

-- Update table statistics
ANALYZE v_properties;
