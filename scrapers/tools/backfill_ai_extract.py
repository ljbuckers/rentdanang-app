#!/usr/bin/env python3
"""Backfill AI extractions for all existing listings.

Processes listings through Claude Haiku to extract correct structured data,
then optionally applies corrections to the listings table.

Usage:
    # Dry run — extract and store in ai_extractions, don't modify listings
    python tools/backfill_ai_extract.py

    # Apply corrections to listings table
    python tools/backfill_ai_extract.py --apply

    # Process only Facebook listings (most correction needed)
    python tools/backfill_ai_extract.py --source facebook

    # Process only listings missing key fields
    python tools/backfill_ai_extract.py --incomplete-only

    # Reprocess with a new prompt version
    python tools/backfill_ai_extract.py --force
"""

import argparse
import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras
from loguru import logger

# Add parent to path so we can import from scrapers
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from processing.ai_extractor import AIExtractor, PROMPT_VERSION

# Configure logging
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")
logger.add("logs/backfill_{time:YYYY-MM-DD}.log", rotation="1 day", level="DEBUG")


def get_db():
    return psycopg2.connect(Config.DATABASE_URL)


def fetch_listings(
    source: str | None = None,
    incomplete_only: bool = False,
    force: bool = False,
    limit: int | None = None,
) -> list[dict]:
    """Fetch listings that need AI extraction."""
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    conditions = ["l.is_active = true", "l.is_duplicate = false"]
    params = []

    if source:
        conditions.append("l.source_platform = %s")
        params.append(source)

    if incomplete_only:
        conditions.append("""(
            l.bedrooms IS NULL
            OR l.price_vnd IS NULL OR l.price_vnd = 0
            OR l.area_name IS NULL OR l.area_name = ''
            OR l.area_sqm IS NULL OR l.area_sqm = 0
        )""")

    if not force:
        # Skip listings already extracted with current prompt version
        conditions.append(f"""
            l.id NOT IN (
                SELECT listing_id FROM ai_extractions
                WHERE prompt_version = %s
            )
        """)
        params.append(PROMPT_VERSION)

    where = " AND ".join(conditions)
    query = f"""
        SELECT
            l.id, l.source_platform, l.source_id,
            l.title, l.title_en,
            l.description, l.description_en,
            l.bedrooms, l.bathrooms, l.area_sqm,
            l.price_vnd, l.price_usd, l.price_period,
            l.property_type, l.building_name, l.area_name,
            l.district, l.ward, l.street_address,
            l.furnished, l.floor_number,
            l.contact_phone, l.amenities,
            l.latitude, l.longitude,
            l.source_raw_data
        FROM listings l
        WHERE {where}
        ORDER BY
            CASE l.source_platform
                WHEN 'facebook' THEN 1   -- process Facebook first (most errors)
                WHEN 'batdongsan' THEN 2
                WHEN 'dotproperty' THEN 3
                WHEN 'chotot' THEN 4
                WHEN 'fazwaz' THEN 5     -- least errors
                ELSE 6
            END,
            l.created_at DESC
    """

    if limit:
        query += f" LIMIT {limit}"

    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [dict(r) for r in rows]


def _prepare_for_extraction(row: dict) -> dict:
    """Prepare a DB row for AI extraction."""
    # Get raw text from source_raw_data if available
    raw_data = row.get("source_raw_data")
    raw_text = ""
    if raw_data:
        if isinstance(raw_data, str):
            try:
                raw_data = json.loads(raw_data)
            except json.JSONDecodeError:
                raw_data = {}
        raw_text = raw_data.get("raw_text", "")

    return {
        "id": str(row["id"]),
        "source_platform": row["source_platform"],
        "title": row.get("title") or "",
        "title_en": row.get("title_en") or "",
        "raw_text": raw_text,
        "description": row.get("description") or "",
        "description_en": row.get("description_en") or "",
        # Pass current values for the AI to validate/correct
        "bedrooms": row.get("bedrooms"),
        "bathrooms": row.get("bathrooms"),
        "area_sqm": float(row["area_sqm"]) if row.get("area_sqm") else None,
        "price_vnd": row.get("price_vnd"),
        "property_type": row.get("property_type"),
        "building_name": row.get("building_name"),
    }


def store_extraction(conn, listing_id: str, extraction: dict, tokens_in: int = 0, tokens_out: int = 0):
    """Store an AI extraction result."""
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO ai_extractions
           (listing_id, model_used, prompt_version, extracted_data, confidence, input_tokens, output_tokens)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (
            listing_id,
            "claude-haiku-4-5",
            PROMPT_VERSION,
            json.dumps(extraction),
            extraction.get("confidence", "medium"),
            tokens_in,
            tokens_out,
        ),
    )
    conn.commit()
    cur.close()


def apply_corrections(conn, listing_id: str, extraction: dict, current: dict):
    """Apply AI extraction corrections to the listings table.

    Only updates fields where:
    1. The AI extracted a value AND
    2. The current value is null/missing OR clearly wrong
    """
    updates = []
    params = []

    # Bedrooms: correct if current is null or was obviously wrong
    ai_beds = extraction.get("bedrooms")
    if ai_beds is not None and (current.get("bedrooms") is None or current["bedrooms"] > 10):
        updates.append("bedrooms = %s")
        params.append(ai_beds)

    # Bathrooms: fill if missing
    ai_baths = extraction.get("bathrooms")
    if ai_baths is not None and current.get("bathrooms") is None:
        updates.append("bathrooms = %s")
        params.append(ai_baths)

    # Area sqm: fill if missing, correct if obviously wrong
    ai_area = extraction.get("area_sqm")
    if ai_area is not None:
        cur_area = float(current["area_sqm"]) if current.get("area_sqm") else None
        if cur_area is None or cur_area < 5 or cur_area > 1000:
            updates.append("area_sqm = %s")
            params.append(ai_area)

    # Price: fill if missing or obviously wrong
    ai_price = extraction.get("price_vnd_monthly")
    if ai_price is not None:
        cur_price = current.get("price_vnd")
        if cur_price is None or cur_price == 0 or cur_price < 500_000 or cur_price > 500_000_000:
            updates.append("price_vnd = %s")
            params.append(ai_price)
            # Also update USD
            updates.append("price_usd = %s")
            params.append(round(ai_price / Config.VND_USD_RATE, 2))

    # Property type: fill if missing, correct "room" → actual type
    ai_type = extraction.get("property_type")
    if ai_type is not None:
        cur_type = current.get("property_type")
        if cur_type is None or (cur_type == "room" and ai_type in ("apartment", "house", "villa", "studio")):
            updates.append("property_type = %s")
            params.append(ai_type)

    # Building name: fill if missing
    ai_building = extraction.get("building_name")
    if ai_building and not current.get("building_name"):
        updates.append("building_name = %s")
        params.append(ai_building)

    # District → area_name mapping (if area_name is missing)
    ai_district = extraction.get("district")
    if ai_district and not current.get("area_name"):
        area_name = _district_to_area_name(ai_district)
        if area_name:
            updates.append("area_name = %s")
            params.append(area_name)
            updates.append("district = %s")
            params.append(ai_district)

    # Ward: fill if missing
    ai_ward = extraction.get("ward")
    if ai_ward and not current.get("ward"):
        updates.append("ward = %s")
        params.append(ai_ward)

    # Furnished: fill if missing
    ai_furnished = extraction.get("furnished")
    if ai_furnished and not current.get("furnished"):
        updates.append("furnished = %s")
        params.append(ai_furnished)

    # Floor: fill if missing
    ai_floor = extraction.get("floor")
    if ai_floor is not None and current.get("floor_number") is None:
        updates.append("floor_number = %s")
        params.append(ai_floor)

    # Contact phone: fill if missing
    ai_phone = extraction.get("contact_phone")
    if ai_phone and not current.get("contact_phone"):
        updates.append("contact_phone = %s")
        params.append(ai_phone)

    # Pet friendly: update amenities if detected
    if extraction.get("pet_friendly") is True:
        cur_amenities = current.get("amenities", [])
        if isinstance(cur_amenities, str):
            try:
                cur_amenities = json.loads(cur_amenities)
            except json.JSONDecodeError:
                cur_amenities = []
        if "pet_friendly" not in cur_amenities:
            cur_amenities.append("pet_friendly")
            updates.append("amenities = %s::jsonb")
            params.append(json.dumps(cur_amenities))

    if not updates:
        return 0

    # Execute update
    params.append(listing_id)
    cur = conn.cursor()
    cur.execute(
        f"UPDATE listings SET {', '.join(updates)}, updated_at = NOW() WHERE id = %s",
        params,
    )
    affected = cur.rowcount
    conn.commit()
    cur.close()
    return affected


def _district_to_area_name(district: str) -> str | None:
    """Map district name to the area_name used in our system."""
    mapping = {
        "Son Tra": "Son Tra",
        "Hai Chau": "Hai Chau (Downtown)",
        "Ngu Hanh Son": "Ngu Hanh Son (Marble Mountains)",
        "Thanh Khe": "Hai Chau (Downtown)",  # Close enough to downtown for area classification
        "Lien Chieu": "Lien Chieu (North)",
        "Cam Le": "Hai Chau (Downtown)",
        "Hoa Vang": "Lien Chieu (North)",
    }
    return mapping.get(district)


async def main():
    parser = argparse.ArgumentParser(description="Backfill AI extractions for RentDaNang listings")
    parser.add_argument("--apply", action="store_true", help="Apply corrections to listings table")
    parser.add_argument("--source", type=str, help="Only process this source platform")
    parser.add_argument("--incomplete-only", action="store_true", help="Only process listings missing key fields")
    parser.add_argument("--force", action="store_true", help="Reprocess even if already extracted")
    parser.add_argument("--limit", type=int, help="Max listings to process")
    parser.add_argument("--dry-run", action="store_true", help="Don't store extractions, just print")
    args = parser.parse_args()

    logger.info(f"Starting AI extraction backfill (prompt {PROMPT_VERSION})")
    logger.info(f"Options: apply={args.apply}, source={args.source}, incomplete={args.incomplete_only}, force={args.force}")

    # Fetch listings
    listings = fetch_listings(
        source=args.source,
        incomplete_only=args.incomplete_only,
        force=args.force,
        limit=args.limit,
    )
    logger.info(f"Found {len(listings)} listings to process")

    if not listings:
        logger.info("Nothing to process")
        return

    # Initialize AI extractor
    ai = AIExtractor()
    if not ai.client:
        logger.error("ANTHROPIC_API_KEY not set. Cannot proceed.")
        return

    conn = get_db()

    # Stats
    total = len(listings)
    processed = 0
    corrections_applied = 0
    fields_corrected = 0
    errors = 0
    batch_size = ai.BATCH_SIZE

    # Process in batches
    for i in range(0, total, batch_size):
        batch_rows = listings[i : i + batch_size]
        batch_prepared = [_prepare_for_extraction(r) for r in batch_rows]

        try:
            results = await ai.extract_batch(batch_prepared)

            for row, prepared, extraction in zip(batch_rows, batch_prepared, results):
                listing_id = str(row["id"])

                if extraction is None:
                    errors += 1
                    continue

                processed += 1

                if args.dry_run:
                    logger.info(f"[DRY] {listing_id} ({row['source_platform']}): {json.dumps(extraction, indent=2)}")
                    continue

                # Store extraction result
                store_extraction(conn, listing_id, extraction)

                # Apply corrections if requested
                if args.apply:
                    affected = apply_corrections(conn, listing_id, extraction, dict(row))
                    if affected > 0:
                        corrections_applied += 1
                        # Count how many fields were actually changed
                        fields_corrected += sum(1 for k in [
                            "bedrooms", "bathrooms", "area_sqm", "price_vnd_monthly",
                            "property_type", "building_name", "district", "ward",
                            "furnished", "floor", "contact_phone",
                        ] if extraction.get(k) is not None)

        except Exception as e:
            logger.error(f"Batch error at offset {i}: {e}")
            errors += len(batch_rows)

        # Progress
        done = min(i + batch_size, total)
        pct = round(100 * done / total)
        logger.info(f"Progress: {done}/{total} ({pct}%) | extracted={processed} | corrected={corrections_applied} | errors={errors}")

    conn.close()

    # Final report
    logger.info("=" * 60)
    logger.info(f"BACKFILL COMPLETE")
    logger.info(f"  Total listings:     {total}")
    logger.info(f"  Successfully extracted: {processed}")
    logger.info(f"  Errors:             {errors}")
    if args.apply:
        logger.info(f"  Listings corrected: {corrections_applied}")
        logger.info(f"  Total field fixes:  {fields_corrected}")
    logger.info(f"  Prompt version:     {PROMPT_VERSION}")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
