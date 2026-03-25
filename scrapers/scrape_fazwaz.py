"""
FazWaz.vn scraper: Fetches Da Nang rental listings from fazwaz.vn,
extracts structured data from JSON-LD and onmouseenter card JSON,
classifies areas, and inserts into PostgreSQL.

Data sources per page:
  1. JSON-LD <script type="application/ld+json"> — 30 listings with:
     name, numberOfRooms, url, floorSize, geo.latitude, geo.longitude, address
  2. onmouseenter JSON on listing cards — 30 listings with:
     thumbnail, name, price, detailUrl, formatted_address, area, bedrooms,
     bathrooms, propertyType

Both sources are merged per listing for maximum data extraction.
"""

import json
import re
import sys
import time
import uuid
import random
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from bs4 import BeautifulSoup
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stderr, level="DEBUG", format="<green>{time:HH:mm:ss}</green> | <level>{level:<7}</level> | {message}")

# ── Config ──────────────────────────────────────────────────────────────────

DB_URL = os.getenv("DATABASE_URL", "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang")
VND_USD_RATE = 25500

BASE_URL = "https://www.fazwaz.vn/property-for-rent/vietnam/da-nang"
MAX_PAGES = 10  # 30 listings per page = up to 300 listings

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

# Regex to extract unit ID from FazWaz URLs like /...u6004769
UNIT_ID_REGEX = re.compile(r"u(\d+)")

# Regex to parse VND prices like "33,000,000 ₫/mo"
PRICE_VND_REGEX = re.compile(r"([\d,]+)\s*₫\s*/\s*mo", re.IGNORECASE)
# Regex to parse USD prices like "$1,750/mo", "$500 USD/mo"
PRICE_USD_REGEX = re.compile(r"\$\s*([\d,]+(?:\.\d+)?)\s*(?:USD|CAD)?\s*/\s*mo", re.IGNORECASE)


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


def detect_property_type(text: str, raw_type: str = "") -> str:
    """Detect property type from text and FazWaz propertyType field."""
    combined = f"{text} {raw_type}".lower()
    if "studio" in combined:
        return "studio"
    if any(w in combined for w in ["biệt thự", "villa"]):
        return "villa"
    if any(w in combined for w in ["nhà phố", "townhouse", "house"]):
        return "house"
    if any(w in combined for w in ["penthouse"]):
        return "penthouse"
    if any(w in combined for w in ["condo", "apartment", "căn hộ"]):
        return "apartment"
    if "room" in combined:
        return "room"
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


def parse_price(price_str: str) -> tuple[int | None, float | None]:
    """Parse a FazWaz price string. Returns (price_vnd, price_usd).

    Handles both VND ('33,000,000 ₫/mo') and USD ('$1,750/mo') formats.
    """
    if not price_str:
        return None, None

    # Try VND format first (e.g. "33,000,000 ₫/mo")
    match = PRICE_VND_REGEX.search(price_str)
    if match:
        num_str = match.group(1).replace(",", "")
        try:
            price_vnd = int(num_str)
            price_usd = round(price_vnd / VND_USD_RATE, 2)
            return price_vnd, price_usd
        except ValueError:
            pass

    # Try USD format (e.g. "$1,750/mo", "$500 USD/mo")
    match = PRICE_USD_REGEX.search(price_str)
    if match:
        num_str = match.group(1).replace(",", "")
        try:
            price_usd = float(num_str)
            price_vnd = int(price_usd * VND_USD_RATE)
            return price_vnd, price_usd
        except ValueError:
            pass

    # Fallback: try to extract any number with ₫ or $
    for pattern, is_vnd in [(r"([\d,]+)\s*₫", True), (r"\$\s*([\d,]+)", False)]:
        fallback = re.search(pattern, price_str)
        if fallback:
            num_str = fallback.group(1).replace(",", "")
            try:
                val = float(num_str)
                if is_vnd:
                    return int(val), round(val / VND_USD_RATE, 2)
                else:
                    return int(val * VND_USD_RATE), round(val, 2)
            except ValueError:
                pass

    return None, None


def extract_unit_id(url: str) -> str | None:
    """Extract the unit ID from a FazWaz detail URL.

    Example: '/vi/.../u6004769' -> 'u6004769'
    """
    if not url:
        return None
    match = UNIT_ID_REGEX.search(url)
    if match:
        return f"u{match.group(1)}"
    return None


# ── HTML Parsing ────────────────────────────────────────────────────────────

def parse_jsonld(soup: BeautifulSoup) -> list[dict]:
    """Extract listings from JSON-LD <script type="application/ld+json"> blocks.

    Returns a list of dicts with: name, numberOfRooms, url, floorSize,
    latitude, longitude, address.
    """
    results = []
    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        try:
            data = json.loads(script.string)
        except (json.JSONDecodeError, TypeError):
            continue

        # JSON-LD can be a single object or a list
        items = data if isinstance(data, list) else [data]
        for item in items:
            # Look for SingleFamilyResidence, Apartment, Product, etc.
            item_type = item.get("@type", "")
            # Also handle ItemList with itemListElement
            if item_type == "ItemList":
                for elem in item.get("itemListElement", []):
                    entry = elem.get("item", elem)
                    parsed = _parse_jsonld_item(entry)
                    if parsed:
                        results.append(parsed)
            else:
                parsed = _parse_jsonld_item(item)
                if parsed:
                    results.append(parsed)
    return results


def _parse_jsonld_item(item: dict) -> dict | None:
    """Parse a single JSON-LD item into a normalized dict."""
    url = item.get("url", "")
    name = item.get("name", "")
    if not url and not name:
        return None

    # Extract geo coordinates
    geo = item.get("geo", {})
    lat = None
    lon = None
    if geo:
        lat = geo.get("latitude")
        lon = geo.get("longitude")
        if lat is not None:
            try:
                lat = float(lat)
            except (ValueError, TypeError):
                lat = None
        if lon is not None:
            try:
                lon = float(lon)
            except (ValueError, TypeError):
                lon = None

    # Floor size
    floor_size = item.get("floorSize", {})
    area_sqm = None
    if isinstance(floor_size, dict):
        val = floor_size.get("value")
        if val:
            try:
                area_sqm = float(val)
            except (ValueError, TypeError):
                pass
    elif isinstance(floor_size, (int, float)):
        area_sqm = float(floor_size)

    # Number of rooms
    rooms = item.get("numberOfRooms")
    bedrooms = None
    if rooms is not None:
        try:
            bedrooms = int(rooms)
        except (ValueError, TypeError):
            pass

    # Address
    address = item.get("address", "")
    if isinstance(address, dict):
        parts = []
        for key in ["streetAddress", "addressLocality", "addressRegion", "addressCountry"]:
            v = address.get(key, "")
            if isinstance(v, dict):
                v = v.get("name", "")
            if v and isinstance(v, str):
                parts.append(v)
        address = ", ".join(parts)

    return {
        "url": url,
        "name": name,
        "latitude": lat,
        "longitude": lon,
        "area_sqm": area_sqm,
        "bedrooms": bedrooms,
        "address": address,
    }


def parse_onmouseenter_cards(soup: BeautifulSoup) -> list[dict]:
    """Extract listing data from onmouseenter JSON attributes on listing cards.

    FazWaz embeds JSON in onmouseenter handlers on listing card elements.
    Returns a list of dicts with: thumbnail, name, price, detailUrl,
    formatted_address, area, bedrooms, bathrooms, propertyType.
    """
    results = []
    # Find all elements with onmouseenter containing JSON-like data
    elements = soup.find_all(attrs={"onmouseenter": True})
    for el in elements:
        handler = el.get("onmouseenter", "")
        # The onmouseenter typically contains a JS function call with JSON arg
        # Try to extract JSON from within the handler
        json_objects = _extract_json_from_handler(handler)
        for obj in json_objects:
            if obj.get("detailUrl") or obj.get("name"):
                results.append(obj)

    # Also look for data attributes that might contain listing JSON
    for el in soup.find_all(attrs={"data-listing": True}):
        try:
            data = json.loads(el["data-listing"])
            if data.get("detailUrl") or data.get("name"):
                results.append(data)
        except (json.JSONDecodeError, TypeError):
            pass

    return results


def _extract_json_from_handler(handler_str: str) -> list[dict]:
    """Extract JSON objects from a JavaScript event handler string."""
    results = []
    # Look for JSON objects in the handler string
    # Common pattern: functionName({...})
    depth = 0
    start = None
    for i, ch in enumerate(handler_str):
        if ch == '{':
            if depth == 0:
                start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and start is not None:
                candidate = handler_str[start:i + 1]
                try:
                    obj = json.loads(candidate)
                    if isinstance(obj, dict):
                        results.append(obj)
                except json.JSONDecodeError:
                    # Try fixing common JS-to-JSON issues (single quotes, trailing commas)
                    try:
                        fixed = candidate.replace("'", '"')
                        # Remove trailing commas before closing braces
                        fixed = re.sub(r",\s*}", "}", fixed)
                        fixed = re.sub(r",\s*]", "]", fixed)
                        obj = json.loads(fixed)
                        if isinstance(obj, dict):
                            results.append(obj)
                    except json.JSONDecodeError:
                        pass
                start = None
    return results


def fetch_page(client: httpx.Client, page: int) -> str:
    """Fetch a single page of FazWaz Da Nang rentals."""
    url = f"{BASE_URL}?page={page}"
    logger.info(f"Fetching page {page}: {url}")
    resp = client.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_page(html: str) -> list[dict]:
    """Parse a single page of HTML, merging JSON-LD and onmouseenter data.

    Returns a list of normalized listing dicts ready for DB insertion.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Parse both data sources
    jsonld_items = parse_jsonld(soup)
    card_items = parse_onmouseenter_cards(soup)

    logger.debug(f"  JSON-LD items: {len(jsonld_items)}, Card items: {len(card_items)}")

    # Index JSON-LD items by unit ID extracted from URL for merging
    jsonld_by_unit = {}
    jsonld_by_name = {}
    for item in jsonld_items:
        uid = extract_unit_id(item.get("url", ""))
        if uid:
            jsonld_by_unit[uid] = item
        name = item.get("name", "").strip()
        if name:
            jsonld_by_name[name] = item

    # Process card items as primary, enriched with JSON-LD data
    merged = []
    seen_unit_ids = set()

    for card in card_items:
        detail_url = card.get("detailUrl", "")
        unit_id = extract_unit_id(detail_url)
        if not unit_id:
            # Try to generate from name or skip
            continue
        if unit_id in seen_unit_ids:
            continue
        seen_unit_ids.add(unit_id)

        # Merge with JSON-LD data
        jld = jsonld_by_unit.get(unit_id, {})
        if not jld:
            # Try matching by name
            card_name = card.get("name", "").strip()
            jld = jsonld_by_name.get(card_name, {})

        entry = _merge_listing(card, jld, unit_id)
        if entry:
            merged.append(entry)

    # Also process JSON-LD items that had no matching card
    for uid, jld in jsonld_by_unit.items():
        if uid not in seen_unit_ids:
            seen_unit_ids.add(uid)
            entry = _merge_listing({}, jld, uid)
            if entry:
                merged.append(entry)

    return merged


def _merge_listing(card: dict, jld: dict, unit_id: str) -> dict | None:
    """Merge card and JSON-LD data into a single normalized listing dict."""
    # Title: prefer card name, fallback to JSON-LD name
    title = card.get("name", "") or jld.get("name", "")
    if not title:
        return None

    # Detail URL
    detail_url = card.get("detailUrl", "") or jld.get("url", "")
    # Ensure full URL
    if detail_url and not detail_url.startswith("http"):
        detail_url = f"https://www.fazwaz.vn{detail_url}"
    source_url = detail_url or f"https://www.fazwaz.vn/property/{unit_id}"

    # Price: from card data (can be VND or USD)
    price_str = card.get("price", "")
    price_vnd = None
    price_usd_final = None
    if isinstance(price_str, str):
        price_vnd, price_usd_final = parse_price(price_str)
    elif isinstance(price_str, (int, float)) and price_str > 0:
        price_vnd = int(price_str * VND_USD_RATE)
        price_usd_final = round(float(price_str), 2)

    # Filter out unreasonable prices (> 100M VND/month is suspicious for a rental)
    if price_vnd and price_vnd > 100_000_000:
        return None

    # Address: prefer card formatted_address, fallback to JSON-LD address
    address = card.get("formatted_address", "") or jld.get("address", "")

    # Coordinates: from JSON-LD (more reliable)
    lat = jld.get("latitude")
    lon = jld.get("longitude")

    # Area (sqm): prefer JSON-LD floorSize, fallback to card area
    area_sqm = jld.get("area_sqm")
    if not area_sqm and card.get("area"):
        try:
            # Card area might be a string like "50 sqm" or just a number
            area_val = card["area"]
            if isinstance(area_val, str):
                nums = re.findall(r"[\d.]+", area_val)
                if nums:
                    area_sqm = float(nums[0])
            elif isinstance(area_val, (int, float)):
                area_sqm = float(area_val)
        except (ValueError, TypeError):
            pass

    # Bedrooms: prefer card, fallback to JSON-LD
    bedrooms = None
    card_beds = card.get("bedrooms")
    if card_beds is not None:
        try:
            bedrooms = int(card_beds)
        except (ValueError, TypeError):
            pass
    if bedrooms is None:
        bedrooms = jld.get("bedrooms")
    # Studio detection
    if bedrooms is None and "studio" in title.lower():
        bedrooms = 0

    # Bathrooms: from card
    bathrooms = None
    card_baths = card.get("bathrooms")
    if card_baths is not None:
        try:
            bathrooms = int(card_baths)
        except (ValueError, TypeError):
            pass

    # Property type
    raw_type = card.get("propertyType", "")
    property_type = detect_property_type(title, raw_type)

    # Images
    images = []
    thumb = card.get("thumbnail", "")
    if thumb:
        if not thumb.startswith("http"):
            thumb = f"https://cdn.fazwaz.com{thumb}" if thumb.startswith("/") else thumb
        images.append(thumb)
    thumbnail = images[0] if images else None

    # Full text for detection
    full_text = f"{title} {address}"

    # Area classification from address
    area_info = classify_area(address)
    area_name = area_info["name"] if area_info else None

    # Also try classifying from title (often contains district info)
    if not area_name:
        area_info_title = classify_area(title)
        if area_info_title:
            area_name = area_info_title["name"]
            area_info = area_info_title

    # If we have coords but no area, try coordinates
    if not area_name and lat and lon:
        area_name = classify_area_by_coords(float(lat), float(lon))

    # Fallback area center if we classified but have no coords
    if area_name and not lat and area_info:
        lat = area_info["center_lat"]
        lon = area_info["center_lon"]

    # Building detection
    building = detect_building(full_text)

    # Amenities & furnished from title (no full description from listing page)
    amenities = detect_amenities(full_text)
    furnished = detect_furnished(full_text)

    # Phone
    phone = extract_phone(full_text)

    # Build raw data for storage
    raw_data = {
        "card": card,
        "jsonld": jld,
        "unit_id": unit_id,
    }

    listing = {
        "id": str(uuid.uuid4()),
        "source_platform": "fazwaz",
        "source_url": source_url,
        "source_id": unit_id,
        "title": title,
        "description": None,  # No description on listing pages
        "property_type": property_type,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "area_sqm": area_sqm,
        "furnished": furnished,
        "price_vnd": price_vnd,
        "price_usd": price_usd_final,
        "price_period": "monthly",
        "area_name": area_name,
        "street_address": address if address else None,
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
        "source_raw_data": json.dumps(raw_data, ensure_ascii=False, default=str),
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
                   WHERE source_platform = 'fazwaz'
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
                   WHERE source_platform = 'fazwaz'
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
    logger.info("FazWaz.vn Scraper — Da Nang Rentals")
    logger.info("=" * 60)

    client = httpx.Client(
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
        },
        follow_redirects=True,
    )

    all_listings = []

    for page in range(1, MAX_PAGES + 1):
        try:
            html = fetch_page(client, page)
            listings = parse_page(html)

            logger.info(f"  Page {page}: extracted {len(listings)} listings")

            if not listings:
                logger.info(f"  No listings found on page {page}, stopping pagination")
                break

            all_listings.extend(listings)

            # Random delay between fetches (2-4 seconds)
            if page < MAX_PAGES:
                delay = random.uniform(2.0, 4.0)
                logger.debug(f"  Sleeping {delay:.1f}s before next page...")
                time.sleep(delay)

        except httpx.HTTPStatusError as e:
            logger.error(f"  HTTP error on page {page}: {e.response.status_code}")
            if e.response.status_code == 404:
                logger.info("  Reached end of pagination (404)")
                break
            # For other errors (429, 503), stop to avoid being blocked
            logger.warning("  Stopping pagination due to HTTP error")
            break
        except Exception as e:
            logger.error(f"  Error fetching page {page}: {e}")
            break

    client.close()

    logger.info(f"\nTotal listings processed: {len(all_listings)}")

    # Stats
    with_price = sum(1 for l in all_listings if l["price_vnd"])
    with_area = sum(1 for l in all_listings if l["area_name"])
    with_coords = sum(1 for l in all_listings if l["latitude"])
    with_images = sum(1 for l in all_listings if l["images"] != "[]")
    with_building = sum(1 for l in all_listings if l["building_name"])
    with_sqm = sum(1 for l in all_listings if l["area_sqm"])

    logger.info(f"  With price: {with_price}")
    logger.info(f"  With area classified: {with_area}")
    logger.info(f"  With coordinates: {with_coords}")
    logger.info(f"  With images: {with_images}")
    logger.info(f"  With building name: {with_building}")
    logger.info(f"  With area_sqm: {with_sqm}")

    if not all_listings:
        logger.warning("No listings to insert!")
        return

    # Insert into database
    logger.info(f"\nInserting {len(all_listings)} listings into database...")
    inserted, updated = insert_listings(all_listings)

    # Verify
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM listings WHERE is_active = true AND source_platform = 'fazwaz'")
        total_fazwaz = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM listings WHERE is_active = true")
        total_all = cur.fetchone()[0]
        cur.execute(
            "SELECT area_name, COUNT(*) FROM listings WHERE is_active = true AND source_platform = 'fazwaz' AND area_name IS NOT NULL GROUP BY area_name ORDER BY COUNT(*) DESC"
        )
        area_breakdown = cur.fetchall()
        cur.close()
        conn.close()

        logger.info(f"\nFazWaz active listings: {total_fazwaz}")
        logger.info(f"Total active listings (all platforms): {total_all}")
        logger.info("FazWaz area breakdown:")
        for area_name, count in area_breakdown:
            logger.info(f"  {area_name}: {count}")
    except Exception as e:
        logger.error(f"  DB verification error: {e}")

    logger.info("\nDone! Refresh http://localhost:3000 to see listings on the map.")


if __name__ == "__main__":
    main()
