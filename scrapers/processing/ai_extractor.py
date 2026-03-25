"""AI-powered structured data extraction using Claude Haiku.

Reads listing text (title, description, raw) and extracts correct structured data.
Designed to fix regex extraction errors (bedroom=571, price sentinels, etc.)
and fill gaps in unstructured sources like Facebook.

Usage:
    extractor = AIExtractor()

    # Single listing
    result = await extractor.extract_single(raw_text, description_en, source_platform)

    # Batch (8 per API call, ~$0.001/listing)
    results = await extractor.extract_batch(listings)
"""

import json
import asyncio
from datetime import datetime, timezone

import os

# Use OpenRouter (openai SDK) if available, otherwise Anthropic SDK
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
if OPENROUTER_API_KEY:
    from openai import OpenAI as _ClientClass
else:
    import anthropic
from loguru import logger

from config import Config

# Prompt version — increment when changing the extraction prompt
PROMPT_VERSION = "v1.0"

# Model to use (Haiku is ~$0.001/listing at batch of 8)
if OPENROUTER_API_KEY:
    MODEL = "anthropic/claude-haiku-4.5"
    USE_OPENROUTER = True
else:
    MODEL = "claude-haiku-4-5-20251001"
    USE_OPENROUTER = False

EXTRACTION_PROMPT = """You are a rental listing data extractor for Da Nang, Vietnam.

Extract structured data from each listing. Return a JSON array with one object per listing, in order.

SCHEMA (use null for unknown fields, never guess):
{
  "bedrooms": int or null,       // 0 = studio. MUST be 0-12. If the text says "571" bedrooms, that's area_sqm, not bedrooms.
  "bathrooms": int or null,      // MUST be 0-8
  "area_sqm": number or null,    // square meters. MUST be 10-1000. Convert from m2/sqm/sq.m
  "price_vnd_monthly": int or null,  // normalize ALL prices to VND per month
  "property_type": "apartment" | "house" | "villa" | "studio" | "room" | "shophouse" | null,
  "furnished": "furnished" | "semi-furnished" | "unfurnished" | null,
  "floor": int or null,          // floor number, MUST be 0-80
  "building_name": string or null,
  "district": string or null,    // One of: "Son Tra", "Hai Chau", "Ngu Hanh Son", "Thanh Khe", "Lien Chieu", "Cam Le", "Hoa Vang"
  "ward": string or null,
  "street": string or null,
  "amenities": string[],
  "pet_friendly": bool or null,
  "contact_phone": string or null, // Vietnamese format: 0XX XXXX XXXX or +84 XX XXXX XXXX
  "confidence": "high" | "medium" | "low"
}

PRICE RULES:
- "15tr" or "15 triệu" = 15,000,000 VND/month
- "$500" or "500 USD" = multiply by 25,500 to get VND
- "₫14,000" on Facebook usually means 14,000,000 VND (thousands dropped)
- Prices under 500,000 VND/month are almost certainly errors — set null
- Prices over 200,000,000 VND/month are almost certainly sale prices — set null
- "$9,999,999" is Facebook's "make offer" sentinel — set null

BEDROOM RULES:
- If the number seems like area (e.g. 50, 80, 120, 571), it's NOT bedrooms — use null or the real count from the description
- Vietnamese: "phòng ngủ" / "PN" = bedrooms, "phòng tắm" / "WC" = bathrooms
- Studios should be bedrooms=0

DISTRICT RECOGNITION:
- "Sơn Trà" / "Son Tra" / "Sơn Trà District" → "Son Tra"
- "Hải Châu" / "Hai Chau" / "center" / "downtown" → "Hai Chau"
- "Ngũ Hành Sơn" / "Ngu Hanh Son" / "Marble Mountains" → "Ngu Hanh Son"
- "Thanh Khê" / "Thanh Khe" → "Thanh Khe"
- "Liên Chiểu" / "Lien Chieu" → "Lien Chieu"
- "Cẩm Lệ" / "Cam Le" → "Cam Le"
- "Hòa Vang" / "Hoa Vang" → "Hoa Vang"
- "An Thượng" / "An Thuong" / "Mỹ An" / "My An" → district is "Ngu Hanh Son"
- "Phước Mỹ" / "Phuoc My" → district is "Son Tra"

BUILDING RECOGNITION (Da Nang):
Azura, Monarchy, Blooming Tower, F.Home/FHome, Alphanam, Hilton, Hyatt, Muong Thanh/Mường Thanh,
Fusion Suites, Naman Retreat, Premier Sky, Filmore, Risemount, Sun Cosmo, Soleil, Hiyori,
Indochina Riverside, OceanView/Ocean View, Zen Diamond, Altara, The Sang, Peninsula,
Vinpearl, Samatha, Green Diamond, Central Coast, BRG Diamond, Wyndham, FPT Plaza, Thanh Binh Green.

Return ONLY valid JSON. No markdown, no explanation."""


def _truncate_text(text: str, max_chars: int = 800) -> str:
    """Truncate text for the prompt, keeping the most informative parts."""
    if not text or len(text) <= max_chars:
        return text or ""
    # Keep first 600 chars (usually has key details) + last 200 (often has contact)
    return text[:600] + "\n...\n" + text[-200:]


def _build_listing_block(listing: dict, index: int) -> str:
    """Build a single listing block for the batch prompt."""
    source = listing.get("source_platform", "unknown")
    raw_text = listing.get("raw_text", "") or listing.get("description", "")
    title = listing.get("title", "") or ""
    desc_en = listing.get("description_en", "") or ""

    # Use English translation if available (more reliable for extraction)
    text_to_analyze = desc_en if desc_en else raw_text

    # Include pre-extracted fields for validation context
    pre_extracted = {}
    for field in ["bedrooms", "bathrooms", "area_sqm", "price_vnd", "property_type", "building_name"]:
        val = listing.get(field)
        if val is not None:
            pre_extracted[field] = val

    parts = [f"--- LISTING {index} (source: {source}) ---"]
    if title:
        parts.append(f"Title: {_truncate_text(title, 200)}")
    parts.append(f"Text: {_truncate_text(text_to_analyze)}")
    if pre_extracted:
        parts.append(f"Pre-extracted (may have errors): {json.dumps(pre_extracted)}")
    parts.append(f"--- END LISTING {index} ---")

    return "\n".join(parts)


class AIExtractor:
    """Extract structured listing data using Claude Haiku with batching."""

    BATCH_SIZE = 8  # listings per API call

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if USE_OPENROUTER:
                self._client = _ClientClass(
                    api_key=OPENROUTER_API_KEY,
                    base_url="https://openrouter.ai/api/v1",
                )
                logger.info("AI extractor using OpenRouter")
            elif Config.ANTHROPIC_API_KEY:
                self._client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
                logger.info("AI extractor using Anthropic direct")
        return self._client

    async def extract_single(
        self,
        listing: dict,
    ) -> dict | None:
        """Extract structured data from a single listing. Returns extraction dict or None on failure."""
        results = await self.extract_batch([listing])
        return results[0] if results else None

    async def extract_batch(
        self,
        listings: list[dict],
    ) -> list[dict | None]:
        """Extract structured data from a batch of listings.

        Args:
            listings: List of raw listing dicts (must have raw_text or description_en)

        Returns:
            List of extraction result dicts (same order as input). None for failed extractions.
        """
        if not self.client:
            logger.warning("Anthropic API not configured, skipping AI extraction")
            return [None] * len(listings)

        # Split into sub-batches
        results = []
        for i in range(0, len(listings), self.BATCH_SIZE):
            batch = listings[i : i + self.BATCH_SIZE]
            batch_results = await self._process_batch(batch)
            results.extend(batch_results)

        return results

    async def _process_batch(self, batch: list[dict]) -> list[dict | None]:
        """Process a single batch of up to BATCH_SIZE listings."""
        if not batch:
            return []

        # Build the prompt
        listing_blocks = []
        for idx, listing in enumerate(batch, 1):
            listing_blocks.append(_build_listing_block(listing, idx))

        user_content = (
            f"Extract structured data from these {len(batch)} rental listings in Da Nang, Vietnam.\n"
            f"Return a JSON array with exactly {len(batch)} objects, one per listing, in order.\n\n"
            + "\n\n".join(listing_blocks)
        )

        try:
            if USE_OPENROUTER:
                # OpenAI-compatible API (OpenRouter)
                response = await asyncio.to_thread(
                    self.client.chat.completions.create,
                    model=MODEL,
                    max_tokens=4096,
                    messages=[
                        {"role": "system", "content": EXTRACTION_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                )
                raw_text = response.choices[0].message.content.strip()
            else:
                # Native Anthropic SDK
                response = await asyncio.to_thread(
                    self.client.messages.create,
                    model=MODEL,
                    max_tokens=4096,
                    system=EXTRACTION_PROMPT,
                    messages=[{"role": "user", "content": user_content}],
                )
                raw_text = response.content[0].text.strip()

            # Parse JSON from response (handle markdown code blocks)
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            parsed = json.loads(raw_text)

            if isinstance(parsed, dict):
                # Single result wrapped in dict — normalize to list
                parsed = [parsed]

            if not isinstance(parsed, list):
                logger.error(f"AI extraction returned unexpected type: {type(parsed)}")
                return [None] * len(batch)

            # Pad or trim to match batch size
            while len(parsed) < len(batch):
                parsed.append(None)
            parsed = parsed[: len(batch)]

            # Post-process: validate and annotate
            results = []
            for item in parsed:
                if item is None:
                    results.append(None)
                    continue
                results.append(self._validate_extraction(item))

            # Log token usage
            usage = getattr(response, "usage", None)
            if usage:
                in_tok = getattr(usage, "input_tokens", None) or getattr(usage, "prompt_tokens", 0)
                out_tok = getattr(usage, "output_tokens", None) or getattr(usage, "completion_tokens", 0)
                logger.debug(
                    f"AI extraction batch: {len(batch)} listings, "
                    f"{in_tok} in / {out_tok} out tokens"
                )

            return results

        except json.JSONDecodeError as e:
            logger.error(f"AI extraction JSON parse error: {e}")
            return [None] * len(batch)
        except Exception as e:
            if "APIError" in type(e).__name__ or "api" in str(type(e)).lower():
                logger.error(f"AI extraction API error: {e}")
            else:
                logger.error(f"AI extraction error: {e}")
            return [None] * len(batch)
        except Exception as e:
            logger.error(f"AI extraction unexpected error: {e}")
            return [None] * len(batch)

    def _validate_extraction(self, data: dict) -> dict:
        """Validate and sanitize extracted fields."""
        # Bedrooms: must be 0-12
        beds = data.get("bedrooms")
        if beds is not None:
            if not isinstance(beds, (int, float)) or beds < 0 or beds > 12:
                data["bedrooms"] = None

        # Bathrooms: must be 0-8
        baths = data.get("bathrooms")
        if baths is not None:
            if not isinstance(baths, (int, float)) or baths < 0 or baths > 8:
                data["bathrooms"] = None

        # Area: must be 10-1000 sqm
        area = data.get("area_sqm")
        if area is not None:
            if not isinstance(area, (int, float)) or area < 10 or area > 1000:
                data["area_sqm"] = None

        # Price: must be 500K-200M VND
        price = data.get("price_vnd_monthly")
        if price is not None:
            if not isinstance(price, (int, float)) or price < 500_000 or price > 200_000_000:
                data["price_vnd_monthly"] = None

        # Floor: must be 0-80
        floor = data.get("floor")
        if floor is not None:
            if not isinstance(floor, (int, float)) or floor < 0 or floor > 80:
                data["floor"] = None

        # Ensure amenities is a list
        if not isinstance(data.get("amenities"), list):
            data["amenities"] = []

        # Normalize building names
        building = data.get("building_name")
        if building:
            data["building_name"] = _normalize_building_name(building)

        return data


def _normalize_building_name(name: str) -> str:
    """Normalize building name variants to canonical form."""
    ALIASES = {
        "fhome": "F.Home",
        "f.home": "F.Home",
        "f home": "F.Home",
        "oceanview": "OceanView",
        "ocean view": "OceanView",
        "muong thanh": "Muong Thanh",
        "mường thanh": "Muong Thanh",
        "premier sky": "Premier Sky Residences",
        "premier sky residences": "Premier Sky Residences",
        "altara suites": "Altara",
        "altara": "Altara",
        "hiyori garden tower": "Hiyori",
        "hiyori": "Hiyori",
        "the sang residence": "The Sang",
        "the sang": "The Sang",
        "four points sheraton": "Four Points Sheraton",
        "four points": "Four Points Sheraton",
        "hyatt regency": "Hyatt Regency",
        "hyatt": "Hyatt Regency",
        "hagl": "Hoang Anh Gia Lai",
        "hoang anh gia lai": "Hoang Anh Gia Lai",
        "sun cosmo": "Sun Cosmo",
        "blooming tower": "Blooming Tower",
        "blooming": "Blooming Tower",
    }
    key = name.lower().strip()
    return ALIASES.get(key, name)
