"""
Scraper for dotproperty.com.vn Da Nang rentals.

Uses the XHR JSON trick: the same search URL returns JSON when the
X-Requested-With: XMLHttpRequest header is sent. The JSON response
contains `properties_total` and `content` (an HTML string with listing cards).

Parses listing cards from the HTML using BeautifulSoup.
"""

import json
import random
import re
import sys
import time
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from bs4 import BeautifulSoup
from loguru import logger

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    level="DEBUG",
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<7}</level> | {message}",
)

# ── Config ──────────────────────────────────────────────────────────────────

DB_URL = os.getenv("DATABASE_URL", "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang")
VND_USD_RATE = 25500

SEARCH_URL = "https://www.dotproperty.com.vn/en/properties-for-rent/%C4%91%C3%A0-n%E1%BA%B5ng"
MAX_PAGES = 10  # 25 listings per page = up to 250 listings

# Area classification by address keywords
AREA_CLASSIFICATION = [
    {
        "name": "An Thuong / My An",
        "keywords": [
            "an thượng", "an thuong", "mỹ an", "my an", "mỹ khê", "my khe",
            "ngũ hành sơn", "ngu hanh son", "khuê mỹ", "khue my",
        ],
        "center_lat": 16.0466,
        "center_lon": 108.2432,
    },
    {
        "name": "Son Tra",
        "keywords": [
            "sơn trà", "son tra", "an hải", "an hai", "phước mỹ", "phuoc my",
            "mân thái", "man thai", "thọ quang", "tho quang", "nại hiên", "nai hien",
        ],
        "center_lat": 16.1000,
        "center_lon": 108.2500,
    },
    {
        "name": "Hai Chau (Downtown)",
        "keywords": [
            "hải châu", "hai chau", "thạch thang", "thach thang", "thanh bình",
            "thanh binh", "thuận phước", "thuan phuoc", "hòa cường", "hoa cuong",
            "nam dương", "nam duong", "bình hiên", "binh hien", "bình thuận", "binh thuan",
            "hòa thuận", "hoa thuan", "phước ninh", "phuoc ninh", "trung tâm",
        ],
        "center_lat": 16.0678,
        "center_lon": 108.2208,
    },
    {
        "name": "Ngu Hanh Son (Marble Mountains)",
        "keywords": [
            "ngũ hành sơn", "ngu hanh son", "hòa hải", "hoa hai", "hòa quý", "hoa quy",
            "non nước", "non nuoc", "marble mountain",
        ],
        "center_lat": 16.0200,
        "center_lon": 108.2500,
    },
    {
        "name": "Lien Chieu (North)",
        "keywords": [
            "liên chiểu", "lien chieu", "hòa khánh", "hoa khanh",
            "hòa minh", "hoa minh", "hòa hiệp", "hoa hiep",
        ],
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
    "furnished": re.compile(
        r"full\s*(?:nội thất|noi that|furniture)|đầy đủ nội thất|fully?\s*furnished",
        re.IGNORECASE,
    ),
    "semi-furnished": re.compile(
        r"(?:semi|nửa)\s*(?:nội thất|furnished)", re.IGNORECASE
    ),
    "unfurnished": re.compile(
        r"(?:không|ko)\s*(?:nội thất|furniture)|unfurnished|trống", re.IGNORECASE
    ),
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


def detect_property_type(text: str) -> str:
    """Detect property type from text."""
    text_lower = text.lower()
    if "studio" in text_lower:
        return "studio"
    if any(w in text_lower for w in ["biệt thự", "villa"]):
        return "villa"
    if any(w in text_lower for w in ["nhà phố", "townhouse", "house", "nhà nguyên căn"]):
        return "house"
    if any(w in text_lower for w in ["phòng trọ", "room"]):
        return "room"
    if any(w in text_lower for w in ["căn hộ", "apartment", "chung cư", "condo", "penthouse"]):
        return "apartment"
    if any(w in text_lower for w in ["đất", "land"]):
        return "land"
    if any(w in text_lower for w in ["shophouse", "shop"]):
        return "shophouse"
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


# ── Price Parsing ───────────────────────────────────────────────────────────


def parse_price_vnd(price_text: str) -> int | None:
    """
    Parse a VND price string into an integer.

    Handles formats like:
      - "130,000,000 VND/month"
      - "25.000.000 VND"
      - "₫ 15,000,000"
      - "15 triệu" / "15 million"
      - "130000000"
    """
    if not price_text:
        return None

    text = price_text.strip()

    # Check for "triệu" (million) shorthand: "15 triệu" = 15,000,000
    m = re.search(r"([\d.,]+)\s*(?:triệu|tri[eê]u|million)", text, re.IGNORECASE)
    if m:
        try:
            val = float(m.group(1).replace(",", "."))
            return int(val * 1_000_000)
        except ValueError:
            pass

    # Check for "tỷ" (billion) shorthand
    m = re.search(r"([\d.,]+)\s*(?:tỷ|ty|billion)", text, re.IGNORECASE)
    if m:
        try:
            val = float(m.group(1).replace(",", "."))
            return int(val * 1_000_000_000)
        except ValueError:
            pass

    # Extract all digit groups separated by commas or dots
    # e.g. "130,000,000" or "130.000.000"
    m = re.search(r"([\d][\d.,]*[\d])", text)
    if m:
        num_str = m.group(1)
        # Determine if commas or dots are thousand separators
        # If the string has commas followed by 3 digits, commas are thousands
        if re.match(r"^\d{1,3}(,\d{3})+$", num_str):
            # "130,000,000" format
            return int(num_str.replace(",", ""))
        elif re.match(r"^\d{1,3}(\.\d{3})+$", num_str):
            # "130.000.000" format
            return int(num_str.replace(".", ""))
        else:
            # Try plain number
            try:
                cleaned = num_str.replace(",", "").replace(".", "")
                return int(cleaned)
            except ValueError:
                pass

    return None


# ── Dotproperty Fetch & Parse ───────────────────────────────────────────────


def fetch_search_page(client: httpx.Client, page: int) -> dict | None:
    """Fetch a search results page as JSON using the XHR header trick."""
    params = {"page": page}
    try:
        resp = client.get(SEARCH_URL, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        total = data.get("properties_total", 0)
        logger.info(f"  Page {page}: fetched JSON (total properties: {total})")
        return data
    except httpx.HTTPStatusError as e:
        logger.error(f"  HTTP error on page {page}: {e.response.status_code}")
        return None
    except Exception as e:
        logger.error(f"  Fetch error on page {page}: {e}")
        return None


def parse_listing_card(card) -> dict | None:
    """
    Parse a single listing card element from the HTML content.
    Extracts uuid, title, price, beds, baths, area, location, images, facilities.
    """
    # data-uuid attribute
    source_id = card.get("data-uuid", "").strip()
    if not source_id:
        # Try alternative: look for a listing ID in the link
        link_el = card.select_one("a[href]")
        if link_el:
            href = link_el.get("href", "")
            # Extract ID from URL like /en/property/some-slug-123456
            m = re.search(r"-(\d+)(?:\.html)?$", href)
            if m:
                source_id = m.group(1)
        if not source_id:
            return None

    # Title and URL from the title link
    title_el = card.select_one("h2 a, h3 a, .listing-title a, [class*='title'] a, a[title]")
    if not title_el:
        # Fallback: first link with text
        title_el = card.select_one("a[href]")

    title = ""
    source_url = ""
    if title_el:
        title = title_el.get_text(strip=True)
        href = title_el.get("href", "")
        if href:
            if href.startswith("/"):
                source_url = f"https://www.dotproperty.com.vn{href}"
            elif href.startswith("http"):
                source_url = href
            else:
                source_url = f"https://www.dotproperty.com.vn/{href}"

    if not title:
        title = card.get_text(strip=True)[:200]

    # Location / address
    location_el = card.select_one(
        "[class*='location'], [class*='address'], .listing-location, "
        "[class*='Location'], span[class*='geo'], .property-location"
    )
    address = location_el.get_text(strip=True) if location_el else ""

    # If no explicit location element, try to extract from the card text
    if not address:
        # Look for text containing "Da Nang" or district names
        all_text = card.get_text(" ", strip=True)
        for area_def in AREA_CLASSIFICATION:
            for kw in area_def["keywords"]:
                if kw in all_text.lower():
                    address = all_text
                    break
            if address:
                break

    # Price — dotproperty uses class 'text-secondary-base font-bold text-3xl'
    price_el = card.select_one(
        "[class*='text-secondary-base'][class*='font-bold'], "
        "[class*='price'], [class*='Price'], .listing-price, "
        "[class*='cost'], span[class*='amount']"
    )
    price_text = price_el.get_text(strip=True) if price_el else ""
    price_vnd = parse_price_vnd(price_text)

    # If price looks like USD (below 100,000), might need conversion
    # But dotproperty primarily shows VND, so we trust the parse
    # Filter out unreasonable prices (sale prices or garbage)
    if price_vnd and price_vnd > 500_000_000:
        # Likely a sale price, not rental
        logger.debug(f"  Skipping {source_id}: price {price_vnd} VND looks like a sale")
        return None

    price_usd = round(price_vnd / VND_USD_RATE, 2) if price_vnd else None

    # Bedrooms, bathrooms, area from listing attributes
    bedrooms = None
    bathrooms = None
    area_sqm = None

    # Try structured attribute elements (beds, baths, area icons/labels)
    attr_elements = card.select(
        "[class*='bed'], [class*='bath'], [class*='area'], [class*='sqm'], "
        "[class*='Bed'], [class*='Bath'], [class*='Area'], [class*='Sqm'], "
        "[class*='attribute'], [class*='feature'], [class*='spec'], "
        "li, .listing-attr, [class*='info']"
    )

    card_text = card.get_text(" ", strip=True)

    # Extract bedrooms from text
    bed_match = re.search(r"(\d+)\s*(?:bed(?:room)?s?|BR|phòng ngủ|PN)", card_text, re.IGNORECASE)
    if bed_match:
        bedrooms = int(bed_match.group(1))

    # Extract bathrooms from text
    bath_match = re.search(r"(\d+)\s*(?:bath(?:room)?s?|BA|WC|phòng tắm|PT)", card_text, re.IGNORECASE)
    if bath_match:
        bathrooms = int(bath_match.group(1))

    # Extract area from text
    area_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:m²|m2|sqm|sq\.?\s*m)", card_text, re.IGNORECASE)
    if area_match:
        area_sqm = float(area_match.group(1))

    # Studio detection
    if "studio" in card_text.lower() and bedrooms is None:
        bedrooms = 0

    # Images
    images = []
    img_elements = card.select("img[src], img[data-src], img[data-lazy-src]")
    for img in img_elements:
        img_url = img.get("data-src") or img.get("data-lazy-src") or img.get("src", "")
        if img_url and not img_url.startswith("data:"):
            if img_url.startswith("//"):
                img_url = f"https:{img_url}"
            elif img_url.startswith("/"):
                img_url = f"https://www.dotproperty.com.vn{img_url}"
            # Skip tiny placeholder/icon images
            if "placeholder" not in img_url.lower() and "icon" not in img_url.lower():
                images.append(img_url)

    # Also check for background-image style on picture/source elements
    source_elements = card.select("source[srcset], source[data-srcset]")
    for src_el in source_elements:
        srcset = src_el.get("data-srcset") or src_el.get("srcset", "")
        if srcset:
            # Take the first URL from srcset
            first_url = srcset.split(",")[0].strip().split(" ")[0]
            if first_url and not first_url.startswith("data:"):
                if first_url.startswith("//"):
                    first_url = f"https:{first_url}"
                images.append(first_url)

    # Deduplicate images while preserving order
    seen_imgs = set()
    unique_images = []
    for img_url in images:
        if img_url not in seen_imgs:
            seen_imgs.add(img_url)
            unique_images.append(img_url)
    images = unique_images[:20]

    thumbnail = images[0] if images else None

    # Facilities / amenities from card
    facilities_el = card.select("[class*='facilit'], [class*='amenit'], [class*='tag']")
    facilities_text = " ".join(el.get_text(" ", strip=True) for el in facilities_el)

    # Combine all text for detection
    full_text = f"{title} {address} {card_text} {facilities_text}"

    # Area classification
    area_info = classify_area(f"{address} {title}")
    area_name = area_info["name"] if area_info else None

    # Fallback: try classifying from the full text
    if not area_name:
        area_info = classify_area(full_text)
        area_name = area_info["name"] if area_info else None

    # Coordinates: dotproperty cards may have data-lat/data-lng
    lat = None
    lon = None
    for attr in ["data-lat", "data-latitude"]:
        if card.get(attr):
            try:
                lat = float(card[attr])
            except (ValueError, TypeError):
                pass
    for attr in ["data-lng", "data-lon", "data-longitude"]:
        if card.get(attr):
            try:
                lon = float(card[attr])
            except (ValueError, TypeError):
                pass

    # If no coords but we have area, use area center
    if not lat and area_info:
        lat = area_info["center_lat"]
        lon = area_info["center_lon"]

    # If we have coords but no area, try to classify by coordinates
    if not area_name and lat and lon:
        area_name = classify_area_by_coords(lat, lon)

    # Building detection
    building = detect_building(full_text)

    # Property type detection
    property_type = detect_property_type(full_text)

    # Amenities & furnished status
    amenities = detect_amenities(full_text)
    furnished = detect_furnished(full_text)

    # Phone from text
    phone = extract_phone(full_text)

    listing = {
        "id": str(uuid.uuid4()),
        "source_platform": "dotproperty",
        "source_url": source_url,
        "source_id": source_id,
        "title": title[:500] if title else None,
        "description": None,  # Full description requires detail page fetch
        "property_type": property_type,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "area_sqm": area_sqm,
        "furnished": furnished,
        "price_vnd": price_vnd,
        "price_usd": price_usd,
        "price_period": "monthly",
        "area_name": area_name,
        "street_address": address if address else None,
        "building_name": building,
        "latitude": lat,
        "longitude": lon,
        "amenities": json.dumps(amenities),
        "contact_phone": phone,
        "images": json.dumps(images),
        "thumbnail_url": thumbnail,
        "is_active": True,
        "is_verified": False,
        "is_duplicate": False,
        "source_raw_data": json.dumps(
            {"card_html": str(card), "price_text": price_text, "address": address},
            ensure_ascii=False,
            default=str,
        ),
    }

    listing["quality_score"] = compute_quality_score(listing)

    return listing


def parse_listings_from_html(html_content: str) -> list:
    """
    Parse individual listing cards from the HTML content returned
    in the JSON `content` field.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # Try common listing card selectors used by dotproperty
    cards = soup.select("[data-uuid]")

    if not cards:
        # Fallback: try other common patterns
        for selector in [
            ".listing-card",
            ".property-card",
            "[class*='listing-item']",
            "[class*='PropertyCard']",
            "[class*='property-item']",
            ".card",
            "article",
            "[class*='search-result']",
            ".col-12.col-md-6",
            "[class*='listing']",
        ]:
            cards = soup.select(selector)
            if cards:
                logger.debug(f"  Found {len(cards)} cards using selector: {selector}")
                break

    if not cards:
        # Last resort: find all divs with links that look like property URLs
        all_links = soup.select("a[href*='/property/'], a[href*='/properties/']")
        # Group by parent containers
        parent_set = set()
        card_list = []
        for link in all_links:
            parent = link.parent
            if parent and id(parent) not in parent_set:
                parent_set.add(id(parent))
                card_list.append(parent)
        cards = card_list
        if cards:
            logger.debug(f"  Found {len(cards)} cards via property link parents")

    logger.info(f"  Parsed {len(cards)} listing cards from HTML")
    return cards


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
            if (
                existing
                and listing["price_vnd"]
                and existing[0]
                and int(existing[0]) != int(listing["price_vnd"])
            ):
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
                logger.debug(
                    f"  Price change for {listing['source_id']}: {existing[0]} -> {listing['price_vnd']}"
                )

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
                   WHERE source_platform = 'dotproperty'
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
                   WHERE source_platform = 'dotproperty'
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

    logger.info(
        f"DB results: {inserted} inserted, {updated} updated, "
        f"{price_changes} price changes, {errors} errors"
    )
    return inserted, updated


# ── Main ────────────────────────────────────────────────────────────────────


def main():
    logger.info("=" * 60)
    logger.info("Dotproperty Scraper -- Da Nang Rentals")
    logger.info("=" * 60)

    client = httpx.Client(
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.dotproperty.com.vn/en/properties-for-rent/",
        },
        follow_redirects=True,
    )

    all_listings = []
    seen_ids = set()  # Deduplicate across pages

    for page in range(1, MAX_PAGES + 1):
        logger.info(f"\nFetching page {page}/{MAX_PAGES}...")

        data = fetch_search_page(client, page)
        if not data:
            logger.warning(f"  Failed to fetch page {page}, stopping.")
            break

        html_content = data.get("content", "")
        if not html_content:
            logger.warning(f"  No HTML content on page {page}, stopping.")
            break

        cards = parse_listings_from_html(html_content)
        if not cards:
            logger.warning(f"  No listing cards found on page {page}, stopping.")
            break

        page_count = 0
        for card in cards:
            listing = parse_listing_card(card)
            if listing and listing["source_id"] not in seen_ids:
                seen_ids.add(listing["source_id"])
                all_listings.append(listing)
                page_count += 1

        logger.info(f"  Extracted {page_count} unique listings from page {page}")

        # Check if we have reached the last page
        total_properties = data.get("properties_total", 0)
        if total_properties > 0 and page * 25 >= total_properties:
            logger.info("  Reached last page of results.")
            break

        # Random delay between pages
        if page < MAX_PAGES:
            delay = random.uniform(2.0, 4.0)
            logger.debug(f"  Sleeping {delay:.1f}s before next page...")
            time.sleep(delay)

    client.close()

    logger.info(f"\nTotal listings processed: {len(all_listings)}")

    if not all_listings:
        logger.warning("No listings to insert!")
        return

    # Stats
    with_price = sum(1 for l in all_listings if l["price_vnd"])
    with_area = sum(1 for l in all_listings if l["area_name"])
    with_coords = sum(1 for l in all_listings if l["latitude"])
    with_images = sum(1 for l in all_listings if l["images"] != "[]")
    with_building = sum(1 for l in all_listings if l["building_name"])
    with_beds = sum(1 for l in all_listings if l["bedrooms"] is not None)

    logger.info(f"  With price: {with_price}")
    logger.info(f"  With area classified: {with_area}")
    logger.info(f"  With coordinates: {with_coords}")
    logger.info(f"  With images: {with_images}")
    logger.info(f"  With building name: {with_building}")
    logger.info(f"  With bedrooms: {with_beds}")

    # Property type breakdown
    type_counts = {}
    for l in all_listings:
        pt = l["property_type"]
        type_counts[pt] = type_counts.get(pt, 0) + 1
    logger.info("  Property types: " + ", ".join(f"{k}: {v}" for k, v in sorted(type_counts.items())))

    # Insert into database
    logger.info(f"\nInserting {len(all_listings)} listings into database...")
    inserted, updated = insert_listings(all_listings)

    # Verify
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM listings WHERE is_active = true")
    total = cur.fetchone()[0]
    cur.execute(
        "SELECT area_name, COUNT(*) FROM listings "
        "WHERE is_active = true AND area_name IS NOT NULL "
        "GROUP BY area_name ORDER BY COUNT(*) DESC"
    )
    area_breakdown = cur.fetchall()
    cur.execute(
        "SELECT COUNT(*) FROM listings WHERE source_platform = 'dotproperty' AND is_active = true"
    )
    dp_total = cur.fetchone()[0]
    cur.close()
    conn.close()

    logger.info(f"\nDatabase now has {total} total active listings ({dp_total} from dotproperty)")
    logger.info("Area breakdown (all platforms):")
    for area_name, count in area_breakdown:
        logger.info(f"  {area_name}: {count}")

    logger.info("\nDone! Refresh http://localhost:3000 to see listings on the map.")


if __name__ == "__main__":
    main()
