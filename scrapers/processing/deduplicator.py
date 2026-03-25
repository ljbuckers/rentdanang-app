"""Deduplication engine using phone match, image pHash, and listing attribute scoring."""

import json

import psycopg2
import redis
from loguru import logger

from config import Config

# Scoring thresholds
DUPLICATE_THRESHOLD = 70
REVIEW_THRESHOLD = 50


class Deduplicator:
    """Detect duplicate listings across sources."""

    def __init__(self):
        self.redis_client = redis.from_url(Config.REDIS_URL)

    def _get_db_connection(self):
        return psycopg2.connect(Config.DATABASE_URL)

    def check_duplicate(self, listing: dict) -> dict:
        """
        Check if a listing is a duplicate of an existing one.

        Returns:
            {
                "is_duplicate": bool,
                "duplicate_of": str | None (UUID of original),
                "score": int,
                "needs_review": bool,
            }
        """
        score = 0
        matched_id = None

        conn = self._get_db_connection()
        try:
            cur = conn.cursor()

            # 1. Phone match (+40 points)
            phone = listing.get("contact_phone")
            if phone:
                phone_clean = phone.replace(" ", "").replace(".", "").replace("-", "")
                cur.execute(
                    """
                    SELECT id, price_vnd, bedrooms, area_sqm, building_name
                    FROM listings
                    WHERE contact_phone = %s AND is_active = true
                    ORDER BY created_at DESC
                    LIMIT 5
                    """,
                    (phone_clean,),
                )
                phone_matches = cur.fetchall()

                if phone_matches:
                    score += 40
                    matched_id = str(phone_matches[0][0])

                    # Additional scoring against phone-matched listings
                    for row in phone_matches:
                        extra = 0
                        # Price match (+20) - Strong signal
                        if listing.get("price_vnd") and row[1]:
                            price_diff = abs(listing["price_vnd"] - row[1]) / max(row[1], 1)
                            if price_diff < 0.05:
                                extra += 20
                        # Bedrooms match (+10)
                        if listing.get("bedrooms") is not None and row[2] is not None:
                            if listing["bedrooms"] == row[2]:
                                extra += 10
                        # Area match (+5)
                        if listing.get("area_sqm") and row[3]:
                            area_diff = abs(listing["area_sqm"] - float(row[3])) / max(float(row[3]), 1)
                            if area_diff < 0.1:
                                extra += 5
                        # Building match (+10)
                        if listing.get("building_name") and row[4]:
                            if listing["building_name"].lower() == row[4].lower():
                                extra += 10

                        if 40 + extra > score:
                            score = 40 + extra
                            matched_id = str(row[0])

            # 2. Image pHash match (+30 points) - check against stored hashes
            # Exclude known amenity images (pool, gym, etc) to prevent false matches
            image_hashes = listing.get("_image_hashes", [])
            if image_hashes and not matched_id:
                for phash in image_hashes:
                    cur.execute(
                        """
                        SELECT listing_id FROM image_hashes
                        WHERE phash = %s
                        AND NOT EXISTS (SELECT 1 FROM amenity_hashes WHERE phash = image_hashes.phash)
                        LIMIT 1
                        """,
                        (phash,),
                    )
                    hash_match = cur.fetchone()
                    if hash_match:
                        score += 30
                        if not matched_id:
                            matched_id = str(hash_match[0])
                        break

            # 3. Source ID exact match (same listing re-scraped)
            source_id = listing.get("source_id")
            source_platform = listing.get("source_platform")
            if source_id and source_platform:
                cur.execute(
                    """
                    SELECT id FROM listings
                    WHERE source_platform = %s AND source_id = %s
                    LIMIT 1
                    """,
                    (source_platform, source_id),
                )
                source_match = cur.fetchone()
                if source_match:
                    return {
                        "is_duplicate": True,
                        "duplicate_of": str(source_match[0]),
                        "score": 100,
                        "needs_review": False,
                        "action": "update",  # Update existing instead of creating new
                    }

            cur.close()
        finally:
            conn.close()

        is_dup = score >= DUPLICATE_THRESHOLD
        needs_review = REVIEW_THRESHOLD <= score < DUPLICATE_THRESHOLD

        return {
            "is_duplicate": is_dup,
            "duplicate_of": matched_id if is_dup else None,
            "score": score,
            "needs_review": needs_review,
            "action": "skip" if is_dup else ("review" if needs_review else "insert"),
        }
