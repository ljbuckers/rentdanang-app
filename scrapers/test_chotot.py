"""
Test scraper: Fetches 1-2 pages of Da Nang rentals from Cho Tot's public API,
extracts structured data, classifies areas, and inserts into PostgreSQL.

No external API keys required (no Google Translate, Maps, Anthropic, or R2).
"""

import json
import re
import sys
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stderr, level="DEBUG", format="<green>{time:HH:mm:ss}</green> | <level>{level:<7}</level> | {message}")

# ── Config ──────────────────────────────────────────────────────────────────

DB_URL = os.getenv("DATABASE_URL", "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang")
VND_USD_RATE = 25500

# Cho Tot API — region_v2=50 is Da Nang
# cg=1010: apartments, 1020: rooms, 1030: houses
# st=u: for rent
API_BASE = "https://gateway.chotot.com/v1/public/ad-listing"
DETAIL_BASE = "https://gateway.chotot.com/v1/public/ad-listing"

CATEGORIES = [
    {"cg": 1010, "label": "Apartments"},
    {"cg": 1020, "label": "Rooms"},
    {"cg": 1030, "label": "Houses"},
]

# Area classification by address keywords
AREA_CLASSIFICATION = [
    {
        "name": "An Thuong / My An",
        "keywords": ["an thượng", "an thuong", "mỹ an", "my an", "mỹ khê", "my khe",
                     "ngũ hành sơn", "ngu hanh son", "khuê mỹ", "khue my"],
        "center_lat": 16.0466,
        "center_lon": 108.2432,
    },
    {
        "name": "Son Tra",
        "keywords": ["sơn trà", "son tra", "an hải", "an hai", "phước mỹ", "phuoc my",
                     "mân thái", "man thai", "thọ quang", "tho quang", "nại hiên", "nai hien"],
        "center_lat": 16.1000,
        "center_lon": 108.2500,
    },
    {
        "name": "Hai Chau (Downtown)",
        "keywords": ["hải châu", "hai chau", "thạch thang", "thach thang", "thanh bình",
                     "thanh binh", "thuận phước", "thuan phuoc", "hòa cường", "hoa cuong",
                     "nam dương", "nam duong", "bình hiên", "binh hien", "bình thuận", "binh thuan",
                     "hòa thuận", "hoa thuan", "phước ninh", "phuoc ninh", "trung tâm"],
        "center_lat": 16.0678,
        "center_lon": 108.2208,
    },
    {
        "name": "Ngu Hanh Son (Marble Mountains)",
        "keywords": ["ngũ hành sơn", "ngu hanh son", "hòa hải", "hoa hai", "hòa quý", "hoa quy",
                     "non nước", "non nuoc", "marble mountain"],
        "center_lat": 16.0200,
        "center_lon": 108.2500,
    },
    {
        "name": "Lien Chieu (North)",
        "keywords": ["liên chiểu", "lien chieu", "hòa khánh", "hoa khanh",
                     "hòa minh", "hoa minh", "hòa hiệp", "hoa hiep"],
        "center_lat": 16.0900,
        "center_lon": 108.1500,
    },
]

# Known buildings for matching
KNOWN_BUILDINGS = [
    "Monarchy", "Azura", "Hiyori", "Fivitel", "Indochina Riverside",
    "Blooming Tower", "Fusion Suites", "Alphanam", "Daewoo", "Premier Sky",
    "Filmore", "Risemount", "Sun Cosmo", "Soleil", "F.Home", "FHome",
    "OceanView", "Ocean View", "Zen Diamond", "Altara", "The Sang",
    "Peninsula", "Vinpearl", "Samatha", "Green Diamond", "Hilton",
    "Novotel", "Four Points", "Hyatt", "Marriott", "Muong Thanh",
    "Mường Thanh", "HAGL", "Hoang Anh Gia Lai", "Da Nang Plaza",
    "Naman Retreat", "Chicland", "Belle Maison", "Central Coast",
    "BRG Diamond", "Wyndham", "FPT Plaza", "Thanh Binh Green",
]

# Amenity detection patterns
AMENITY_PATTERNS = {
    "swimming_pool": re.compile(r"hồ bơi|pool|bể bơi|swimming", re.IGNORECASE),
    "gym": re.compile(r"phòng gym|gym|fitness", re.IGNORECASE),
    "balcony": re.compile(r"ban công|balcony", re.IGNORECASE),
    "ocean_view": re.compile(r"view biển|ocean view|sea view", re.IGNORECASE),
    "parking": re.compile(r"bãi đỗ xe|parking|đậu xe|để xe", re.IGNORECASE),
    "elevator": re.compile(r"thang máy|elevator", re.IGNORECASE),
    "washing_machine": re.compile(r"máy giặt|washing|washer", re.IGNORECASE),
    "kitchen": re.compile(r"bếp|kitchen", re.IGNORECASE),
    "air_conditioning": re.compile(r"điều hòa|điều hoà|air.?con|máy lạnh", re.IGNORECASE),
    "wifi": re.compile(r"wifi|wi-fi|internet", re.IGNORECASE),
}

FURNISHED_PATTERNS = {
    "furnished": re.compile(r"full\s*(?:nội thất|noi that|furniture)|đầy đủ nội thất|fully?\s*furnished", re.IGNORECASE),
    "semi-furnished": re.compile(r"(?:semi|nửa)\s*(?:nội thất|furnished)", re.IGNORECASE),
    "unfurnished": re.compile(r"(?:không|ko)\s*(?:nội thất|furniture)|unfurnished|trống", re.IGNORECASE),
}

PHONE_REGEX = re.compile(r"0[3-9]\d[\s.\-]?\d{3}[\s.\-]?\d{3,4}")


# ── Helper Functions ────────────────────────────────────────────────────────

def classify_area(address: str) -> dict | None:
    """Classify a Da Nang address into one of 5 areas."""
    if not address:
        return None
    addr_lower = address.lower()
    for area in AREA_CLASSIFICATION:
        for kw in area["keywords"]:
            if kw in addr_lower:
                return area
    return None


def classify_area_by_coords(lat: float, lon: float) -> str | None:
    """Classify area by lat/lon proximity to area centers."""
    AREA_BOUNDS = [
        {"name": "An Thuong / My An", "lat_min": 16.03, "lat_max": 16.06, "lon_min": 108.23, "lon_max": 108.26},
        {"name": "Son Tra", "lat_min": 16.06, "lat_max": 16.15, "lon_min": 108.22, "lon_max": 108.34},
        {"name": "Hai Chau (Downtown)", "lat_min": 16.04, "lat_max": 16.08, "lon_min": 108.20, "lon_max": 108.23},
        {"name": "Ngu Hanh Son (Marble Mountains)", "lat_min": 15.98, "lat_max": 16.03, "lon_min": 108.23, "lon_max": 108.28},
        {"name": "Lien Chieu (North)", "lat_min": 16.06, "lat_max": 16.12, "lon_min": 108.12, "lon_max": 108.18},
    ]
    for area in AREA_BOUNDS:
        if area["lat_min"] <= lat <= area["lat_max"] and area["lon_min"] <= lon <= area["lon_max"]:
            return area["name"]
    # Nearest center fallback
    best = None
    best_dist = float("inf")
    for ac in AREA_CLASSIFICATION:
        dist = (lat - ac["center_lat"]) ** 2 + (lon - ac["center_lon"]) ** 2
        if dist < best_dist:
            best_dist = dist
            best = ac["name"]
    # Only assign if reasonably close (within ~5km)
    if best_dist < 0.005:
        return best
    return None


def detect_building(text: str) -> str | None:
    """Match text against known Da Nang buildings."""
    text_lower = text.lower()
    for b in KNOWN_BUILDINGS:
        if b.lower() in text_lower:
            return b
    return None


def detect_property_type(text: str, cg: int) -> str:
    """Detect property type from text and category."""
    text_lower = text.lower()
    if "studio" in text_lower:
        return "studio"
    if any(w in text_lower for w in ["biệt thự", "villa"]):
        return "villa"
    # Fall back to category
    if cg == 1010:
        return "apartment"
    if cg == 1020:
        return "room"
    if cg == 1030:
        return "house"
    return "apartment"


def detect_furnished(text: str) -> str | None:
    for status, pattern in FURNISHED_PATTERNS.items():
        if pattern.search(text):
            return status
    return None


def detect_amenities(text: str) -> list[str]:
    return [name for name, pat in AMENITY_PATTERNS.items() if pat.search(text)]


def extract_phone(text: str) -> str | None:
    match = PHONE_REGEX.search(text)
    if match:
        return re.sub(r"[\s.\-]", "", match.group())
    return None


def compute_quality_score(listing: dict) -> float:
    """Score 0-1 based on data completeness."""
    score = 0.0
    if listing.get("price_vnd"):
        score += 0.2
    if listing.get("bedrooms") is not None:
        score += 0.1
    if listing.get("area_sqm"):
        score += 0.1
    if listing.get("latitude"):
        score += 0.15
    if listing.get("building_name"):
        score += 0.1
    if listing.get("contact_phone"):
        score += 0.1
    if listing.get("images") and len(listing["images"]) > 0:
        score += 0.15
    if listing.get("description"):
        score += 0.1
    return round(min(score, 1.0), 2)


# ── Cho Tot API Client ──────────────────────────────────────────────────────

def fetch_listings_page(client: httpx.Client, cg: int, page: int, limit: int = 20) -> list[dict]:
    """Fetch one page of listings from Cho Tot API."""
    offset = (page - 1) * limit
    params = {
        "region": 3,  # Da Nang
        "cg": cg,
        "st": "u",  # for rent (u=cho thue, s=ban)
        "limit": limit,
        "o": offset,
        "page": page,
        "key_param_included": "true",
    }

    resp = client.get(API_BASE, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    ads = data.get("ads", [])
    total = data.get("total", 0)
    logger.info(f"  Page {page}: got {len(ads)} ads (total available: {total})")
    return ads


def fetch_ad_detail(client: httpx.Client, ad_id: int) -> dict | None:
    """Fetch detail for a single ad."""
    try:
        resp = client.get(f"{DETAIL_BASE}/{ad_id}", timeout=10)
        if resp.status_code == 200:
            return resp.json().get("ad", {})
    except Exception as e:
        logger.debug(f"  Detail fetch failed for {ad_id}: {e}")
    return None


# ── Processing ──────────────────────────────────────────────────────────────

def process_ad(ad: dict, cg: int) -> dict | None:
    """Process a single Cho Tot API ad into a normalized listing."""
    ad_id = ad.get("list_id") or ad.get("ad_id")
    if not ad_id:
        return None

    # Skip non-rental ads that slipped through
    if ad.get("type") and ad["type"] != "u":
        return None

    # Basic fields from API response
    subject = ad.get("subject", "")
    body = ad.get("body", "") or ad.get("description", "")
    full_text = f"{subject} {body}"
    price = ad.get("price", 0)
    size = ad.get("size", 0)
    rooms = ad.get("rooms", None) or ad.get("number_of_room", None)
    toilets = ad.get("toilets", None)

    # Build full address from structured fields
    street_number = ad.get("street_number", "")
    street_name = ad.get("street_name", "")
    ward_name = ad.get("ward_name", "")
    area_name_raw = ad.get("area_name", "")
    region_name = ad.get("region_name", "")
    addr_parts = [p for p in [street_number, street_name, ward_name, area_name_raw, region_name] if p]
    full_address = ", ".join(addr_parts)

    # Images — API provides full CDN URLs in image_thumbnails or image field
    images = []
    if ad.get("image_thumbnails"):
        for thumb in ad["image_thumbnails"]:
            if isinstance(thumb, dict) and thumb.get("image"):
                images.append(thumb["image"])
    if not images and ad.get("images"):
        # images field contains URL paths from CDN
        for img_url in ad["images"]:
            if isinstance(img_url, str) and img_url.startswith("http"):
                images.append(img_url)
    if not images and ad.get("image"):
        images.append(ad["image"])
    if not images and ad.get("thumbnail_image"):
        images.append(ad["thumbnail_image"])
    thumbnail = images[0] if images else None

    # Price processing
    price_vnd = int(price) if price and price > 0 else None
    price_usd = round(price_vnd / VND_USD_RATE, 2) if price_vnd else None

    # Filter out sale prices (> 100M/month is not a rental)
    if price_vnd and price_vnd > 100_000_000:
        return None

    # Coordinates — Cho Tot API provides lat/lng directly
    lat = ad.get("latitude")
    lon = ad.get("longitude")

    # Parse location string "lat,lng" as fallback
    if not lat and ad.get("location"):
        loc_str = ad["location"]
        if isinstance(loc_str, str) and "," in loc_str:
            parts = loc_str.split(",")
            try:
                lat = float(parts[0])
                lon = float(parts[1])
            except (ValueError, IndexError):
                pass

    # Area classification from address
    area_info = classify_area(full_address)
    area_name = area_info["name"] if area_info else None

    # If we have coords but no area, try to classify by coordinates
    if not area_name and lat and lon:
        area_name = classify_area_by_coords(float(lat), float(lon))

    # Fallback area center if we classified but have no coords
    if area_name and not lat and area_info:
        lat = area_info["center_lat"]
        lon = area_info["center_lon"]

    # Building detection
    building = detect_building(full_text)

    # Property type
    property_type = detect_property_type(full_text, cg)

    # Amenities & furnished status from description
    amenities = detect_amenities(full_text)
    furnished = detect_furnished(full_text)

    # Phone from description
    phone = extract_phone(full_text)

    # Bedrooms
    bedrooms = None
    if rooms is not None:
        try:
            bedrooms = int(rooms)
        except (ValueError, TypeError):
            pass
    if bedrooms is None and "studio" in full_text.lower():
        bedrooms = 0

    # Bathrooms
    bathrooms = None
    if toilets is not None:
        try:
            bathrooms = int(toilets)
        except (ValueError, TypeError):
            pass

    # Area sqm
    area_sqm = float(size) if size and size > 0 else None

    listing = {
        "id": str(uuid.uuid4()),
        "source_platform": "chotot",
        "source_url": f"https://www.nhatot.com/{ad_id}.htm",
        "source_id": str(ad_id),
        "title": subject,
        "description": body if body else None,
        "property_type": property_type,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "area_sqm": area_sqm,
        "furnished": furnished,
        "price_vnd": price_vnd,
        "price_usd": price_usd,
        "price_period": "monthly",
        "area_name": area_name,
        "street_address": full_address if full_address else None,
        "building_name": building,
        "latitude": lat,
        "longitude": lon,
        "amenities": json.dumps(amenities),
        "contact_phone": phone,
        "images": json.dumps(images[:20]),
        "thumbnail_url": thumbnail,
        "is_active": True,
        "is_verified": False,
        "is_duplicate": False,
        "source_raw_data": json.dumps(ad, ensure_ascii=False, default=str),
    }

    listing["quality_score"] = compute_quality_score(listing)

    return listing


# ── Database Insert ─────────────────────────────────────────────────────────

INSERT_SQL = """
INSERT INTO listings (
    id, source_platform, source_url, source_id, source_raw_data,
    title, description, property_type,
    bedrooms, bathrooms, area_sqm, furnished,
    price_vnd, price_usd, price_period,
    area_name, street_address, building_name,
    latitude, longitude,
    amenities, contact_phone,
    images, thumbnail_url,
    is_active, is_verified, is_duplicate,
    quality_score, scraped_at, first_seen_at, last_seen_at
) VALUES (
    %(id)s, %(source_platform)s, %(source_url)s, %(source_id)s, %(source_raw_data)s,
    %(title)s, %(description)s, %(property_type)s,
    %(bedrooms)s, %(bathrooms)s, %(area_sqm)s, %(furnished)s,
    %(price_vnd)s, %(price_usd)s, %(price_period)s,
    %(area_name)s, %(street_address)s, %(building_name)s,
    %(latitude)s, %(longitude)s,
    %(amenities)s::jsonb, %(contact_phone)s,
    %(images)s::jsonb, %(thumbnail_url)s,
    %(is_active)s, %(is_verified)s, %(is_duplicate)s,
    %(quality_score)s, NOW(), NOW(), NOW()
)
ON CONFLICT (source_platform, source_id) DO UPDATE SET
    price_vnd = EXCLUDED.price_vnd,
    price_usd = EXCLUDED.price_usd,
    last_seen_at = NOW(),
    is_active = true,
    deactivated_at = NULL,
    miss_count = 0
"""


def insert_listings(listings: list[dict]):
    """Insert listings into PostgreSQL, track price changes, deactivate stale listings."""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    inserted = 0
    updated = 0
    price_changes = 0
    errors = 0

    # Collect source_ids we see in this scrape run
    seen_source_ids = set()

    for listing in listings:
        seen_source_ids.add(listing["source_id"])
        try:
            # Check if listing exists and get current price for price_history tracking
            cur.execute(
                "SELECT price_vnd, price_history FROM listings WHERE source_platform = %s AND source_id = %s",
                (listing["source_platform"], listing["source_id"]),
            )
            existing = cur.fetchone()

            cur.execute(INSERT_SQL, listing)
            if cur.statusmessage == "INSERT 0 1":
                inserted += 1
            else:
                updated += 1

            # Track price changes in price_history
            if existing and listing["price_vnd"] and existing[0] and int(existing[0]) != int(listing["price_vnd"]):
                old_history = existing[1] if existing[1] else []
                old_history.append({
                    "price_vnd": int(existing[0]),
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                })
                cur.execute(
                    "UPDATE listings SET price_history = %s::jsonb WHERE source_platform = %s AND source_id = %s",
                    (json.dumps(old_history), listing["source_platform"], listing["source_id"]),
                )
                price_changes += 1
                logger.debug(f"  Price change for {listing['source_id']}: {existing[0]} -> {listing['price_vnd']}")

            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"  DB insert error for {listing['source_id']}: {e}")
            errors += 1

    # Increment miss_count for listings not seen in this scrape run
    # Deactivate after 3 consecutive misses
    if seen_source_ids:
        try:
            # Increment miss_count for unseen active listings
            cur.execute(
                """UPDATE listings
                   SET miss_count = miss_count + 1
                   WHERE source_platform = 'chotot'
                     AND is_active = true
                     AND source_id != ALL(%s)""",
                (list(seen_source_ids),),
            )
            missed = cur.rowcount
            conn.commit()
            if missed > 0:
                logger.info(f"Incremented miss_count for {missed} unseen listings")

            # Deactivate listings that missed 3+ consecutive scrapes
            cur.execute(
                """UPDATE listings
                   SET is_active = false, deactivated_at = NOW()
                   WHERE source_platform = 'chotot'
                     AND is_active = true
                     AND miss_count >= 3""",
            )
            deactivated = cur.rowcount
            conn.commit()
            if deactivated > 0:
                logger.info(f"Deactivated {deactivated} listings after 3 consecutive misses")
        except Exception as e:
            conn.rollback()
            logger.error(f"  Deactivation error: {e}")

    cur.close()
    conn.close()

    logger.info(f"DB results: {inserted} inserted, {updated} updated, {price_changes} price changes, {errors} errors")
    return inserted, updated


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("Cho Tot Test Scraper — Da Nang Rentals")
    logger.info("=" * 60)

    client = httpx.Client(
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        },
        follow_redirects=True,
    )

    all_listings = []

    for cat in CATEGORIES:
        logger.info(f"\nFetching {cat['label']} (cg={cat['cg']})...")

        for page in range(1, 25):  # up to 24 pages per category
            try:
                ads = fetch_listings_page(client, cat["cg"], page, limit=20)
                if not ads:
                    logger.info(f"  No more ads for {cat['label']}")
                    break

                for ad in ads:
                    listing = process_ad(ad, cat["cg"])
                    if listing:
                        all_listings.append(listing)

            except Exception as e:
                logger.error(f"  API error for {cat['label']} page {page}: {e}")
                break

    client.close()

    logger.info(f"\nTotal listings processed: {len(all_listings)}")

    # Stats
    with_price = sum(1 for l in all_listings if l["price_vnd"])
    with_area = sum(1 for l in all_listings if l["area_name"])
    with_coords = sum(1 for l in all_listings if l["latitude"])
    with_images = sum(1 for l in all_listings if l["images"] != "[]")
    with_building = sum(1 for l in all_listings if l["building_name"])

    logger.info(f"  With price: {with_price}")
    logger.info(f"  With area classified: {with_area}")
    logger.info(f"  With coordinates: {with_coords}")
    logger.info(f"  With images: {with_images}")
    logger.info(f"  With building name: {with_building}")

    if not all_listings:
        logger.warning("No listings to insert!")
        return

    # Insert into database
    logger.info(f"\nInserting {len(all_listings)} listings into database...")
    inserted, updated = insert_listings(all_listings)

    # Verify
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM listings WHERE is_active = true")
    total = cur.fetchone()[0]
    cur.execute("SELECT area_name, COUNT(*) FROM listings WHERE is_active = true AND area_name IS NOT NULL GROUP BY area_name ORDER BY COUNT(*) DESC")
    area_breakdown = cur.fetchall()
    cur.close()
    conn.close()

    logger.info(f"\nDatabase now has {total} active listings")
    logger.info("Area breakdown:")
    for area_name, count in area_breakdown:
        logger.info(f"  {area_name}: {count}")

    logger.info("\nDone! Refresh http://localhost:3000 to see listings on the map.")


if __name__ == "__main__":
    main()
