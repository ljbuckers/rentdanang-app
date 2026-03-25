"""Build canonical property records from multiple source listings.

Performs entity resolution (matching listings that represent the same physical property)
and merges fields using source reliability weights.

Usage:
    builder = CanonicalBuilder()
    await builder.build_all()      # Full rebuild
    await builder.build_for(listing_id)  # Single listing
"""

import json
import uuid
from collections import defaultdict
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from loguru import logger

from config import Config

# Source reliability weights (0-1) per field
# Higher = more trustworthy for that field
SOURCE_RELIABILITY = {
    "fazwaz": {
        "bedrooms": 0.95, "bathrooms": 0.90, "area_sqm": 0.90,
        "price": 0.85, "building_name": 0.95, "location": 0.95,
        "property_type": 0.90, "furnished": 0.80,
    },
    "dotproperty": {
        "bedrooms": 0.90, "bathrooms": 0.85, "area_sqm": 0.85,
        "price": 0.80, "building_name": 0.90, "location": 0.85,
        "property_type": 0.85, "furnished": 0.75,
    },
    "chotot": {
        "bedrooms": 0.80, "bathrooms": 0.75, "area_sqm": 0.85,
        "price": 0.90, "building_name": 0.50, "location": 0.85,
        "property_type": 0.80, "furnished": 0.60,
    },
    "batdongsan": {
        "bedrooms": 0.85, "bathrooms": 0.80, "area_sqm": 0.85,
        "price": 0.85, "building_name": 0.85, "location": 0.70,
        "property_type": 0.85, "furnished": 0.70,
    },
    "facebook": {
        "bedrooms": 0.50, "bathrooms": 0.40, "area_sqm": 0.45,
        "price": 0.60, "building_name": 0.60, "location": 0.30,
        "property_type": 0.50, "furnished": 0.50,
    },
}

# AI extraction boosts reliability for Facebook (data was corrected)
AI_RELIABILITY_BOOST = 0.25  # Added to Facebook fields when AI extraction exists


def _get_reliability(source: str, field: str, has_ai_extraction: bool = False) -> float:
    """Get reliability weight for a source+field combination."""
    base = SOURCE_RELIABILITY.get(source, {}).get(field, 0.5)
    if has_ai_extraction and source == "facebook":
        base = min(base + AI_RELIABILITY_BOOST, 0.90)
    return base


class CanonicalBuilder:
    """Build canonical property records by matching and merging source listings."""

    def __init__(self):
        self.conn = psycopg2.connect(Config.DATABASE_URL)

    def close(self):
        if self.conn and not self.conn.closed:
            self.conn.close()

    def find_matches(self) -> list[list[str]]:
        """Find groups of listings that likely represent the same physical property.

        Returns list of groups, each group is a list of listing IDs.
        """
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Strategy 1: Same building + same bedrooms + price within 20%
        cur.execute("""
            WITH building_groups AS (
                SELECT
                    LOWER(TRIM(building_name)) as bldg,
                    bedrooms,
                    ARRAY_AGG(id::text ORDER BY
                        CASE source_platform
                            WHEN 'fazwaz' THEN 1
                            WHEN 'chotot' THEN 2
                            WHEN 'dotproperty' THEN 3
                            WHEN 'batdongsan' THEN 4
                            WHEN 'facebook' THEN 5
                        END
                    ) as listing_ids,
                    COUNT(*) as cnt,
                    COUNT(DISTINCT source_platform) as platform_count,
                    AVG(price_vnd) FILTER (WHERE price_vnd > 0) as avg_price,
                    MIN(price_vnd) FILTER (WHERE price_vnd > 0) as min_price,
                    MAX(price_vnd) FILTER (WHERE price_vnd > 0) as max_price
                FROM listings
                WHERE is_active = true
                  AND is_duplicate = false
                  AND building_name IS NOT NULL
                  AND building_name != ''
                  AND bedrooms IS NOT NULL
                GROUP BY LOWER(TRIM(building_name)), bedrooms
            )
            SELECT bldg, bedrooms, listing_ids, cnt, platform_count,
                   avg_price, min_price, max_price
            FROM building_groups
            WHERE cnt >= 2
              AND (max_price IS NULL OR min_price IS NULL
                   OR max_price <= min_price * 1.3)  -- prices within 30%
            ORDER BY cnt DESC
        """)

        groups = []
        for row in cur.fetchall():
            groups.append([str(lid) for lid in row["listing_ids"]])

        logger.info(f"Found {len(groups)} building+bedroom groups (strategy 1)")

        # Strategy 2: Singletons — listings with no group match
        # These become their own canonical property (1:1 mapping)
        cur.execute("""
            SELECT id FROM listings
            WHERE is_active = true
              AND is_duplicate = false
              AND id NOT IN (
                  SELECT UNNEST(ARRAY_AGG(id))
                  FROM listings
                  WHERE is_active = true
                    AND is_duplicate = false
                    AND building_name IS NOT NULL
                    AND building_name != ''
                    AND bedrooms IS NOT NULL
                  GROUP BY LOWER(TRIM(building_name)), bedrooms
                  HAVING COUNT(*) >= 2
              )
        """)
        singletons = [[str(row["id"])] for row in cur.fetchall()]
        logger.info(f"Found {len(singletons)} singleton listings (strategy 2)")

        cur.close()
        return groups + singletons

    def build_canonical(self, listing_ids: list[str]) -> dict | None:
        """Build a single canonical property from a group of listing IDs.

        Returns the canonical property dict, or None if all listings are invalid.
        """
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("""
            SELECT l.*,
                   ae.extracted_data as ai_data,
                   ae.confidence as ai_confidence
            FROM listings l
            LEFT JOIN LATERAL (
                SELECT extracted_data, confidence
                FROM ai_extractions
                WHERE listing_id = l.id
                ORDER BY created_at DESC
                LIMIT 1
            ) ae ON true
            WHERE l.id::text = ANY(%s)
            ORDER BY
                CASE l.source_platform
                    WHEN 'fazwaz' THEN 1
                    WHEN 'chotot' THEN 2
                    WHEN 'dotproperty' THEN 3
                    WHEN 'batdongsan' THEN 4
                    WHEN 'facebook' THEN 5
                END
        """, (listing_ids,))

        rows = cur.fetchall()
        cur.close()

        if not rows:
            return None

        # Merge fields
        canonical = {
            "id": str(uuid.uuid4()),
            "bedrooms": self._merge_int_field(rows, "bedrooms"),
            "bathrooms": self._merge_int_field(rows, "bathrooms"),
            "area_sqm": self._merge_numeric_field(rows, "area_sqm"),
            "price_vnd_monthly": self._merge_int_field(rows, "price_vnd", field_key="price", min_val=500000, max_val=500000000),
            "property_type": self._merge_categorical_field(rows, "property_type"),
            "furnished": self._merge_categorical_field(rows, "furnished"),
            "floor_number": self._merge_int_field(rows, "floor_number"),
            "building_name": self._merge_categorical_field(rows, "building_name"),
            "district": self._merge_categorical_field(rows, "district"),
            "ward": self._merge_categorical_field(rows, "ward"),
            "street_address": self._merge_categorical_field(rows, "street_address"),
            "area_name": self._merge_categorical_field(rows, "area_name"),
            "latitude": None,
            "longitude": None,
            "amenities": self._merge_amenities(rows),
            "source_count": len(rows),
            "first_seen_at": min(r["first_seen_at"] or r["created_at"] for r in rows),
            "last_seen_at": max(r["last_seen_at"] or r["updated_at"] for r in rows),
            "is_active": any(r["is_active"] for r in rows),
        }

        # Location: use best available
        for row in rows:
            if row.get("latitude") and row.get("longitude"):
                canonical["latitude"] = float(row["latitude"])
                canonical["longitude"] = float(row["longitude"])
                break

        # Confidence score
        canonical["confidence_score"] = self._calculate_confidence(rows, canonical)

        # Source contributions
        canonical["_sources"] = []
        for row in rows:
            contributions = {}
            for field in ["bedrooms", "bathrooms", "area_sqm", "price_vnd", "property_type",
                          "building_name", "area_name", "latitude"]:
                if row.get(field) is not None:
                    contributions[field] = True
            canonical["_sources"].append({
                "listing_id": str(row["id"]),
                "source_platform": row["source_platform"],
                "match_method": "building+beds" if len(listing_ids) > 1 else "singleton",
                "field_contributions": contributions,
            })

        return canonical

    def _merge_int_field(self, rows: list, field: str, field_key: str | None = None, min_val: int | None = None, max_val: int | None = None) -> int | None:
        """Merge an integer field using weighted reliability."""
        key = field_key or field
        values = []
        for row in rows:
            val = row.get(field)
            # Also check AI extraction
            ai_val = None
            if row.get("ai_data"):
                ai_data = row["ai_data"]
                if isinstance(ai_data, str):
                    ai_data = json.loads(ai_data)
                ai_val = ai_data.get(field) or ai_data.get(f"{field}_monthly")

            if val is not None:
                weight = _get_reliability(row["source_platform"], key, bool(row.get("ai_data")))
                values.append((val, weight))
            if ai_val is not None and ai_val != val:
                weight = _get_reliability(row["source_platform"], key, True) + 0.1
                values.append((ai_val, weight))

        if not values:
            return None

        # Use median for outlier resistance
        values.sort(key=lambda x: x[0])
        if len(values) == 1:
            return int(values[0][0])

        # Weighted median-ish: pick the value with highest total weight
        value_weights = defaultdict(float)
        for val, weight in values:
            value_weights[val] += weight

        best = max(value_weights.items(), key=lambda x: x[1])
        result = int(best[0])
        if min_val is not None and result < min_val:
            return None
        if max_val is not None and result > max_val:
            return None
        return result

    def _merge_numeric_field(self, rows: list, field: str) -> float | None:
        """Merge a numeric field using weighted average (excluding outliers)."""
        values = []
        for row in rows:
            val = row.get(field)
            if val is not None and float(val) > 0:
                weight = _get_reliability(row["source_platform"], field, bool(row.get("ai_data")))
                values.append((float(val), weight))

        if not values:
            return None
        if len(values) == 1:
            return round(values[0][0], 2)

        # Remove outliers (>50% from median)
        sorted_vals = sorted(v[0] for v in values)
        median = sorted_vals[len(sorted_vals) // 2]
        filtered = [(v, w) for v, w in values if abs(v - median) / max(median, 1) < 0.5]

        if not filtered:
            return round(median, 2)

        # Weighted average
        total_weight = sum(w for _, w in filtered)
        weighted_avg = sum(v * w for v, w in filtered) / total_weight
        return round(weighted_avg, 2)

    def _merge_categorical_field(self, rows: list, field: str) -> str | None:
        """Merge a categorical field — highest reliability wins."""
        best_val = None
        best_weight = -1

        for row in rows:
            val = row.get(field)
            if val and str(val).strip():
                weight = _get_reliability(row["source_platform"], field, bool(row.get("ai_data")))
                if weight > best_weight:
                    best_weight = weight
                    best_val = str(val).strip()

        return best_val

    def _merge_amenities(self, rows: list) -> list:
        """Merge amenities — union of all sources."""
        all_amenities = set()
        for row in rows:
            amenities = row.get("amenities", [])
            if isinstance(amenities, str):
                try:
                    amenities = json.loads(amenities)
                except json.JSONDecodeError:
                    amenities = []
            if isinstance(amenities, list):
                all_amenities.update(amenities)
        return sorted(all_amenities)

    def _calculate_confidence(self, rows: list, canonical: dict) -> float:
        """Calculate overall confidence score (0-1)."""
        score = 0
        max_score = 10

        # Field completeness
        if canonical.get("price_vnd_monthly"):
            score += 2
        if canonical.get("bedrooms") is not None:
            score += 1.5
        if canonical.get("area_sqm"):
            score += 1
        if canonical.get("latitude"):
            score += 2
        if canonical.get("building_name"):
            score += 0.5
        if canonical.get("area_name"):
            score += 1

        # Multi-source bonus
        platforms = set(r["source_platform"] for r in rows)
        if len(platforms) >= 3:
            score += 2
        elif len(platforms) >= 2:
            score += 1

        return round(min(score / max_score, 1.0), 2)

    def save_canonical(self, canonical: dict) -> str | None:
        """Save a canonical property and its source links."""
        cur = self.conn.cursor()

        try:
            # Insert canonical property
            location_val = None
            if canonical.get("latitude") and canonical.get("longitude"):
                location_val = f"SRID=4326;POINT({canonical['longitude']} {canonical['latitude']})"

            cur.execute("""
                INSERT INTO canonical_properties (
                    id, bedrooms, bathrooms, area_sqm, price_vnd_monthly,
                    property_type, furnished, floor_number,
                    building_name, district, ward, street_address, area_name,
                    latitude, longitude, location,
                    amenities, confidence_score, source_count,
                    first_seen_at, last_seen_at, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s::geography,
                    %s::jsonb, %s, %s,
                    %s, %s, %s
                )
                ON CONFLICT (id) DO UPDATE SET
                    bedrooms = EXCLUDED.bedrooms,
                    bathrooms = EXCLUDED.bathrooms,
                    area_sqm = EXCLUDED.area_sqm,
                    price_vnd_monthly = EXCLUDED.price_vnd_monthly,
                    property_type = EXCLUDED.property_type,
                    furnished = EXCLUDED.furnished,
                    floor_number = EXCLUDED.floor_number,
                    building_name = EXCLUDED.building_name,
                    district = EXCLUDED.district,
                    ward = EXCLUDED.ward,
                    street_address = EXCLUDED.street_address,
                    area_name = EXCLUDED.area_name,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    location = EXCLUDED.location,
                    amenities = EXCLUDED.amenities,
                    confidence_score = EXCLUDED.confidence_score,
                    source_count = EXCLUDED.source_count,
                    last_seen_at = EXCLUDED.last_seen_at,
                    is_active = EXCLUDED.is_active,
                    updated_at = NOW()
                RETURNING id
            """, (
                canonical["id"],
                canonical.get("bedrooms"), canonical.get("bathrooms"),
                canonical.get("area_sqm"), canonical.get("price_vnd_monthly"),
                canonical.get("property_type"), canonical.get("furnished"),
                canonical.get("floor_number"),
                canonical.get("building_name"), canonical.get("district"),
                canonical.get("ward"), canonical.get("street_address"),
                canonical.get("area_name"),
                canonical.get("latitude"), canonical.get("longitude"),
                location_val,
                json.dumps(canonical.get("amenities", [])),
                canonical.get("confidence_score"), canonical.get("source_count"),
                canonical.get("first_seen_at"), canonical.get("last_seen_at"),
                canonical.get("is_active", True),
            ))

            result = cur.fetchone()

            # Insert source links
            for source in canonical.get("_sources", []):
                cur.execute("""
                    INSERT INTO canonical_sources
                        (canonical_id, listing_id, source_platform, match_method, field_contributions)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (canonical_id, listing_id) DO UPDATE SET
                        field_contributions = EXCLUDED.field_contributions
                """, (
                    canonical["id"],
                    source["listing_id"],
                    source["source_platform"],
                    source["match_method"],
                    json.dumps(source.get("field_contributions", {})),
                ))

            self.conn.commit()
            return canonical["id"]

        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to save canonical property: {e}")
            return None
        finally:
            cur.close()

    async def build_all(self, limit: int | None = None):
        """Full canonical build — match all listings and create canonical records."""
        logger.info("Starting full canonical build...")

        # Clear existing canonical data for rebuild
        cur = self.conn.cursor()
        cur.execute("TRUNCATE canonical_sources, canonical_properties CASCADE")
        self.conn.commit()
        cur.close()

        groups = self.find_matches()
        if limit:
            groups = groups[:limit]

        total = len(groups)
        saved = 0
        multi_source = 0

        for i, group in enumerate(groups):
            canonical = self.build_canonical(group)
            if canonical:
                result = self.save_canonical(canonical)
                if result:
                    saved += 1
                    if len(group) > 1:
                        multi_source += 1

            if (i + 1) % 500 == 0 or i + 1 == total:
                logger.info(f"Progress: {i+1}/{total} | saved={saved} | multi-source={multi_source}")

        logger.info(f"Canonical build complete: {saved} properties ({multi_source} multi-source)")
        return saved
