"""Normalize raw scraped data into the listings table schema and insert into PostgreSQL."""

import json
import uuid
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from loguru import logger

from config import Config
from processing.translator import Translator
from processing.extractor import Extractor
from processing.geocoder import Geocoder
from processing.deduplicator import Deduplicator
from processing.image_processor import ImageProcessor
from utils.text_cleaner import TextCleaner


class Normalizer:
    """Full processing pipeline: translate → extract → geocode → dedup → store."""

    def __init__(self):
        self.translator = Translator()
        self.extractor = Extractor()
        self.geocoder = Geocoder()
        self.deduplicator = Deduplicator()
        self.image_processor = ImageProcessor()
        self.cleaner = TextCleaner()

    def _get_db_connection(self):
        return psycopg2.connect(Config.DATABASE_URL)

    async def process_raw_listing(self, raw: dict) -> dict | None:
        """
        Process a raw listing through the full pipeline.

        Raw dict expected keys:
            - source_platform: str
            - source_url: str (optional)
            - source_id: str (optional)
            - raw_text: str (the listing text)
            - images: list[str] (image URLs)
            - posted_at: str (ISO timestamp, optional)
            - poster_name: str (optional)
            - title: str (optional)
            - address: str (optional)
            - price: number (optional, pre-extracted)
            - bedrooms: int (optional, pre-extracted)
            - area_sqm: float (optional, pre-extracted)

        Returns normalized listing dict ready for DB insert, or None if duplicate/invalid.
        """
        source_platform = raw.get("_source_platform") or raw.get("source_platform", "unknown")
        raw_text = raw.get("raw_text", "") or raw.get("description", "")
        title = raw.get("title", "")
        combined_text = f"{title} {raw_text}".strip()

        if not combined_text:
            logger.warning("Empty listing text, skipping")
            return None

        # Step 1: Language detection + translation
        lang = self.translator.detect_language(combined_text)
        if lang == "vi":
            texts = self.translator.translate_batch([title, raw_text]) if title else ["", self.translator.translate_text(raw_text)]
            title_en = texts[0] if title else None
            description_en = texts[1] if len(texts) > 1 else texts[0]
        else:
            title_en = title
            description_en = raw_text

        # Step 1.5: Text Standardization (Clean up spam/caps)
        title_en = self.cleaner.clean_title(title_en)
        description_en = self.cleaner.clean_description(description_en)

        # Step 2: Extract structured fields
        extraction_text = f"{combined_text} {description_en or ''}"
        extracted = self.extractor.extract(extraction_text)

        # Merge pre-extracted fields (from structured sources like Cho Tot)
        for field in ["price_vnd", "price_usd", "bedrooms", "bathrooms", "area_sqm", "contact_phone", "property_type"]:
            if raw.get(field) is not None and extracted.get(field) is None:
                extracted[field] = raw[field]

        # Step 2.5: Ingest validation — null out obviously corrupt values
        # Bedrooms: Da Nang apartments max ~6 bedrooms; villas rarely exceed 8
        if extracted.get("bedrooms") is not None and extracted["bedrooms"] > 10:
            logger.warning(f"[validate] Bedrooms={extracted['bedrooms']} exceeds bounds, nulling (source: {source_platform})")
            extracted["bedrooms"] = None

        # Bathrooms: same logic
        if extracted.get("bathrooms") is not None and extracted["bathrooms"] > 10:
            logger.warning(f"[validate] Bathrooms={extracted['bathrooms']} exceeds bounds, nulling")
            extracted["bathrooms"] = None

        # Price: no rental in Da Nang costs > 500M VND/month (~$20K USD)
        # Facebook sentinel $9,999,999 converts to ~255B VND
        if extracted.get("price_vnd") is not None and extracted["price_vnd"] > 500_000_000:
            logger.warning(f"[validate] Price={extracted['price_vnd']} VND exceeds bounds, nulling (source: {source_platform})")
            extracted["price_vnd"] = None
            extracted["price_usd"] = None

        # Price too low: anything under 500,000 VND/month (~$20) is likely a parsing error
        # (e.g. ₫14,000 meaning 14M stored as 14,000 literal)
        if extracted.get("price_vnd") is not None and 0 < extracted["price_vnd"] < 500_000:
            logger.warning(f"[validate] Price={extracted['price_vnd']} VND suspiciously low, nulling (source: {source_platform})")
            extracted["price_vnd"] = None
            extracted["price_usd"] = None

        # Area: no apartment is > 1000 sqm (that's a warehouse)
        if extracted.get("area_sqm") is not None and extracted["area_sqm"] > 1000:
            logger.warning(f"[validate] Area={extracted['area_sqm']} sqm exceeds bounds, nulling")
            extracted["area_sqm"] = None

        # Step 3: Geocode
        address = raw.get("address") or extracted.get("address", "")
        building = extracted.get("building_name")
        geo = None

        if address:
            geo = self.geocoder.geocode(address)
        if not geo and building:
            geo = self.geocoder.geocode_from_building(building)

        # Use pre-provided coordinates if available
        if not geo and raw.get("latitude") and raw.get("longitude"):
            geo = {
                "latitude": raw["latitude"],
                "longitude": raw["longitude"],
                "formatted_address": address,
            }

        # Step 4: Classify area
        area_info = {}
        if geo:
            area_info = self.geocoder.classify_area(geo["latitude"], geo["longitude"])

        # Step 5: Process images
        image_urls = raw.get("images", [])
        image_data = {"stored_urls": image_urls, "thumbnail_url": image_urls[0] if image_urls else None, "phashes": []}
        if image_urls:
            try:
                image_data = await self.image_processor.process_images(image_urls)
            except Exception as e:
                logger.error(f"Image processing failed: {e}")

        # Build normalized listing
        listing = {
            "id": str(uuid.uuid4()),
            "source_platform": source_platform,
            "source_url": raw.get("source_url") or raw.get("post_url"),
            "source_id": raw.get("source_id"),
            "source_raw_data": json.dumps(raw, ensure_ascii=False),
            "title": title or None,
            "title_en": title_en,
            "description": raw_text,
            "description_en": description_en,
            "property_type": extracted.get("property_type"),
            "bedrooms": extracted.get("bedrooms"),
            "bathrooms": extracted.get("bathrooms"),
            "area_sqm": extracted.get("area_sqm"),
            "floor_number": extracted.get("floor_number"),
            "furnished": extracted.get("furnished"),
            "price_vnd": extracted.get("price_vnd"),
            "price_usd": extracted.get("price_usd"),
            "price_period": "month",
            "area_name": area_info.get("area_name"),
            "street_address": geo.get("formatted_address") if geo else address,
            "building_name": extracted.get("building_name"),
            "latitude": geo["latitude"] if geo else None,
            "longitude": geo["longitude"] if geo else None,
            "amenities": json.dumps(extracted.get("amenities", [])),
            "contact_name": raw.get("poster_name") or raw.get("contact_name"),
            "contact_phone": extracted.get("contact_phone"),
            "images": json.dumps(image_data.get("stored_urls", [])),
            "thumbnail_url": image_data.get("thumbnail_url"),
            "scraped_at": raw.get("_scraped_at") or datetime.now(timezone.utc).isoformat(),
            "_image_hashes": image_data.get("phashes", []),
        }

        # Step 6: Deduplication
        dedup_result = self.deduplicator.check_duplicate(listing)

        if dedup_result["action"] == "skip":
            logger.debug(f"Skipping duplicate (score={dedup_result['score']}): {listing.get('title', 'untitled')}")
            return None

        if dedup_result["action"] == "update":
            listing["_action"] = "update"
            listing["_existing_id"] = dedup_result["duplicate_of"]
        elif dedup_result["action"] == "review":
            listing["is_duplicate"] = False  # Insert but flag for review
            listing["_needs_review"] = True
        else:
            listing["is_duplicate"] = False

        # Calculate quality score
        listing["quality_score"] = self._calculate_quality(listing)

        return listing

    def _calculate_quality(self, listing: dict) -> float:
        """Calculate listing quality score (0-1) based on data completeness."""
        score = 0
        max_score = 10

        if listing.get("price_vnd"):
            score += 2
        if listing.get("bedrooms") is not None:
            score += 1.5
        if listing.get("area_sqm"):
            score += 1
        if listing.get("latitude"):
            score += 2
        if listing.get("building_name"):
            score += 0.5
        if listing.get("contact_phone"):
            score += 1
        if listing.get("images") and listing["images"] != "[]":
            score += 1
        if listing.get("description_en"):
            score += 1

        return round(min(score / max_score, 1.0), 2)

    async def save_listing(self, listing: dict) -> str | None:
        """Insert or update a listing in PostgreSQL."""
        conn = self._get_db_connection()
        try:
            cur = conn.cursor()

            if listing.get("_action") == "update" and listing.get("_existing_id"):
                existing_id = listing["_existing_id"]

                # Fetch current state to detect price changes and reactivation
                cur.execute(
                    "SELECT price_vnd, is_active FROM listings WHERE id = %s",
                    (existing_id,),
                )
                old_row = cur.fetchone()
                old_price = old_row[0] if old_row else None
                was_inactive = not old_row[1] if old_row else False

                # Update existing listing
                cur.execute(
                    """
                    UPDATE listings SET
                        last_seen_at = NOW(),
                        price_vnd = COALESCE(%s, price_vnd),
                        price_usd = COALESCE(%s, price_usd),
                        images = COALESCE(%s, images),
                        thumbnail_url = COALESCE(%s, thumbnail_url),
                        is_active = true,
                        status = 'active',
                        deactivated_at = NULL,
                        miss_count = 0,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id
                    """,
                    (
                        listing.get("price_vnd"),
                        listing.get("price_usd"),
                        listing.get("images"),
                        listing.get("thumbnail_url"),
                        existing_id,
                    ),
                )
                result = cur.fetchone()

                # Log reactivation event
                if was_inactive and result:
                    cur.execute(
                        """INSERT INTO listing_events (listing_id, event_type, reason)
                           VALUES (%s, 'reactivated', 'scraper_reseen')""",
                        (existing_id,),
                    )
                    logger.info(f"Listing {existing_id} reactivated")

                # Log price change event
                new_price = listing.get("price_vnd")
                if result and new_price and old_price and new_price != old_price:
                    cur.execute(
                        """INSERT INTO listing_events
                           (listing_id, event_type, old_value, new_value)
                           VALUES (%s, 'price_changed', %s, %s)""",
                        (
                            existing_id,
                            json.dumps({"price_vnd": old_price}),
                            json.dumps({"price_vnd": new_price}),
                        ),
                    )
                    logger.info(f"Listing {existing_id} price changed: {old_price} -> {new_price}")

                conn.commit()
                return str(result[0]) if result else None

            # Insert new listing
            listing_id = listing["id"]
            location_sql = None
            if listing.get("latitude") and listing.get("longitude"):
                location_sql = f"ST_SetSRID(ST_MakePoint({listing['longitude']}, {listing['latitude']}), 4326)"

            cur.execute(
                f"""
                INSERT INTO listings (
                    id, source_platform, source_url, source_id, source_raw_data,
                    title, title_en, description, description_en,
                    property_type, bedrooms, bathrooms, area_sqm, floor_number, furnished,
                    price_vnd, price_usd, price_period,
                    area_name, street_address, building_name,
                    latitude, longitude, location,
                    amenities, contact_name, contact_phone,
                    images, thumbnail_url, quality_score,
                    is_active, is_duplicate, scraped_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, {"ST_SetSRID(ST_MakePoint(%s, %s), 4326)" if listing.get("latitude") else "NULL"},
                    %s::jsonb, %s, %s,
                    %s::jsonb, %s, %s,
                    true, false, %s
                )
                ON CONFLICT DO NOTHING
                RETURNING id
                """,
                (
                    listing_id, listing["source_platform"], listing.get("source_url"),
                    listing.get("source_id"), listing.get("source_raw_data"),
                    listing.get("title"), listing.get("title_en"),
                    listing.get("description"), listing.get("description_en"),
                    listing.get("property_type"), listing.get("bedrooms"), listing.get("bathrooms"),
                    listing.get("area_sqm"), listing.get("floor_number"), listing.get("furnished"),
                    listing.get("price_vnd"), listing.get("price_usd"), listing.get("price_period", "month"),
                    listing.get("area_name"), listing.get("street_address"), listing.get("building_name"),
                    listing.get("latitude"), listing.get("longitude"),
                    *([listing["longitude"], listing["latitude"]] if listing.get("latitude") else []),
                    listing.get("amenities", "[]"), listing.get("contact_name"), listing.get("contact_phone"),
                    listing.get("images", "[]"), listing.get("thumbnail_url"), listing.get("quality_score"),
                    listing.get("scraped_at"),
                ),
            )

            result = cur.fetchone()

            # Log activation event for new listings
            if result:
                cur.execute(
                    """INSERT INTO listing_events (listing_id, event_type, reason)
                       VALUES (%s, 'activated', 'new_listing')""",
                    (listing_id,),
                )

            conn.commit()

            # Store image hashes
            if result and listing.get("_image_hashes"):
                for phash in listing["_image_hashes"]:
                    if phash:
                        cur.execute(
                            "INSERT INTO image_hashes (listing_id, phash) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (listing_id, phash),
                        )
                conn.commit()

            cur.close()
            return listing_id if result else None

        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to save listing: {e}")
            return None
        finally:
            conn.close()
