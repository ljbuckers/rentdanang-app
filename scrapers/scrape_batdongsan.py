"""
Bat Dong San scraper: Fetches Da Nang rental listings from batdongsan.com.vn,
parses HTML with BeautifulSoup, classifies areas, and inserts into PostgreSQL.

Uses httpx for HTTP requests (no Playwright/Selenium).

NOTE: batdongsan.com.vn is behind Cloudflare protection. This scraper may get
403 responses. To bypass Cloudflare, you'll need either:
1. Bright Data scraping browser (set BRIGHT_DATA_PROXY env var)
2. A rotating residential proxy with Vietnamese IPs
3. Playwright with stealth plugins (undetected-playwright)
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
logger.add(sys.stderr, level="DEBUG", format="<green>{time:HH:mm:ss}</green> | <level>{level:<7}</level> | {message}")

# -- Config -------------------------------------------------------------------

DB_URL = os.getenv("DATABASE_URL", "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang")
VND_USD_RATE = 25500
BASE_URL = "https://batdongsan.com.vn"
MAX_PAGES_PER_CATEGORY = 10  # 10 pages x 20 listings = 200 per category

# Categories: path suffix -> label, property_type fallback
CATEGORIES = [
    {"path": "/cho-thue-can-ho-chung-cu-da-nang", "label": "Apartments", "prop_type": "apartment"},
    {"path": "/cho-thue-nha-rieng-da-nang", "label": "Houses", "prop_type": "house"},
    {"path": "/cho-thue-phong-tro-da-nang", "label": "Rooms", "prop_type": "room"},
]

# Browser headers — Vietnamese locale, realistic Chrome on Windows
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

# -- Area classification (same 5 areas as chotot scraper) ---------------------

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
    "SAM Tower", "Harmony", "Panoma", "Sun Panoma", "Ori Garden",
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


# -- Helper Functions ---------------------------------------------------------

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


def detect_property_type(text: str, fallback: str) -> str:
    """Detect property type from text with category fallback."""
    text_lower = text.lower()
    if "studio" in text_lower:
        return "studio"
    if any(w in text_lower for w in ["biệt thự", "villa"]):
        return "villa"
    if any(w in text_lower for w in ["penthouse"]):
        return "penthouse"
    return fallback


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


# -- Price Parsing ------------------------------------------------------------

def parse_vnd_price(price_text: str) -> int | None:
    """
    Parse Vietnamese price strings into VND integer.

    Examples:
        "17 triệu/tháng"       -> 17_000_000
        "5,5 triệu/tháng"      -> 5_500_000
        "1.5 triệu/tháng"      -> 1_500_000
        "800 nghìn/tháng"       -> 800_000
        "800.000 đ/tháng"       -> 800_000
        "17,000,000 đ/tháng"    -> 17_000_000
        "100 triệu/tháng"      -> 100_000_000
        "Thỏa thuận"           -> None
    """
    if not price_text:
        return None

    text = price_text.strip().lower()

    # Skip "thỏa thuận" (negotiable) or "liên hệ" (contact)
    if any(kw in text for kw in ["thỏa thuận", "thoa thuan", "liên hệ", "lien he"]):
        return None

    # Try "X triệu/tháng" pattern (most common)
    m = re.search(r"([\d.,]+)\s*triệu", text)
    if m:
        num_str = m.group(1).replace(".", ",")  # normalize separators
        # Handle "5,5" -> 5.5, "17" -> 17
        parts = num_str.split(",")
        if len(parts) == 2 and len(parts[1]) <= 2:
            # Decimal: "5,5" means 5.5 million
            value = float(parts[0]) + float(parts[1]) / (10 ** len(parts[1]))
        else:
            # Integer or comma-separated thousands (rare in triệu context)
            value = float(parts[0])
        return int(value * 1_000_000)

    # Try "X nghìn/tháng" or "X ngàn/tháng"
    m = re.search(r"([\d.,]+)\s*(?:nghìn|ngàn|nghin|ngan)", text)
    if m:
        num_str = m.group(1).replace(",", ".")
        value = float(num_str)
        return int(value * 1_000)

    # Try "X tỷ/tháng" (rare for rentals, but handle it)
    m = re.search(r"([\d.,]+)\s*tỷ", text)
    if m:
        num_str = m.group(1).replace(",", ".")
        value = float(num_str)
        return int(value * 1_000_000_000)

    # Try raw number like "17,000,000" or "800.000" with đ/VND
    m = re.search(r"([\d.,]+)\s*(?:đ|vnd|đồng|dong)", text)
    if m:
        num_str = m.group(1)
        # Remove thousand separators: could be "17,000,000" or "17.000.000"
        # Heuristic: if ends with 3 digits after separator, it's a thousand separator
        cleaned = num_str.replace(",", "").replace(".", "")
        try:
            return int(cleaned)
        except ValueError:
            pass

    return None


def parse_area_sqm(area_text: str) -> float | None:
    """Parse area string like '80 m²' or '110,63 m²' into float."""
    if not area_text:
        return None
    # Match number (with optional comma decimal) before m²
    m = re.search(r"([\d.,]+)\s*m", area_text)
    if m:
        num_str = m.group(1)
        # Handle Vietnamese decimal comma: "110,63" -> 110.63
        # But also "110,3" -> 110.3 (not 1103)
        if "," in num_str and "." not in num_str:
            parts = num_str.split(",")
            if len(parts) == 2 and len(parts[1]) <= 2:
                # Decimal comma
                num_str = parts[0] + "." + parts[1]
            else:
                # Thousand separator (unlikely for area)
                num_str = num_str.replace(",", "")
        try:
            return float(num_str)
        except ValueError:
            pass
    return None



# -- FlareSolverr integration (bypasses Cloudflare) ---------------------------

FLARESOLVERR_URL = "http://localhost:8191/v1"

def fetch_via_flaresolverr(url: str, timeout: int = 30) -> str | None:
    """Fetch a URL via FlareSolverr to bypass Cloudflare protection."""
    import json
    try:
        resp = httpx.post(
            FLARESOLVERR_URL,
            json={"cmd": "request.get", "url": url, "maxTimeout": timeout * 1000},
            timeout=timeout + 10,
        )
        data = resp.json()
        if data.get("status") == "ok" and data.get("solution", {}).get("status") == 200:
            return data["solution"]["response"]
        else:
            logger.error(f"FlareSolverr failed for {url}: status={data.get('status')}")
            return None
    except Exception as e:
        logger.error(f"FlareSolverr request failed for {url}: {e}")
        return None

# -- HTML Parsing -------------------------------------------------------------

def fetch_listing_page(client: httpx.Client, url: str) -> str | None:
    """Fetch a single page of listings HTML via FlareSolverr (CF bypass)."""
    html = fetch_via_flaresolverr(url)
    if html:
        return html
    # Fallback to direct request
    try:
        resp = client.get(url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP {e.response.status_code} for {url}")
        return None
    except Exception as e:
        logger.error(f"Request failed for {url}: {e}")
        return None


def parse_cards_from_html(html: str, category: dict) -> list[dict]:
    """Parse listing cards from a search results page HTML."""
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("div.js__card")
    listings = []

    for card in cards:
        try:
            listing = parse_single_card(card, category)
            if listing:
                listings.append(listing)
        except Exception as e:
            prid = card.get("prid", "unknown")
            logger.debug(f"  Error parsing card {prid}: {e}")

    return listings


def parse_single_card(card, category: dict) -> dict | None:
    """Parse a single listing card element into a normalized dict."""
    # Source ID from prid attribute on the card div
    source_id = card.get("prid")
    if not source_id:
        return None

    # Link and title
    link_el = card.select_one("a.js__product-link-for-product-id")
    if not link_el:
        return None

    href = link_el.get("href", "")
    source_url = f"{BASE_URL}{href}" if href else None
    title = link_el.get("title", "").strip()

    # Title fallback from span
    if not title:
        title_span = card.select_one("span.pr-title.js__card-title")
        if title_span:
            title = title_span.get_text(strip=True)

    if not title:
        return None

    # Price
    price_el = card.select_one("span.re__card-config-price")
    price_text = price_el.get_text(strip=True) if price_el else ""
    price_vnd = parse_vnd_price(price_text)
    price_usd = round(price_vnd / VND_USD_RATE, 2) if price_vnd else None

    # Filter out unreasonable prices (> 100M/month is likely not a rental)
    if price_vnd and price_vnd > 100_000_000:
        return None

    # Area (sqm)
    area_el = card.select_one("span.re__card-config-area")
    area_text = area_el.get_text(strip=True) if area_el else ""
    area_sqm = parse_area_sqm(area_text)

    # Bedrooms
    bedrooms = None
    bed_el = card.select_one("span.re__card-config-bedroom span")
    if bed_el:
        try:
            bedrooms = int(bed_el.get_text(strip=True))
        except (ValueError, TypeError):
            pass

    # Try to extract bedrooms from title if not in structured data
    if bedrooms is None:
        bed_match = re.search(r"(\d+)\s*(?:pn|phòng ngủ|phong ngu|bedroom|br|ngủ)", title, re.IGNORECASE)
        if bed_match:
            bedrooms = int(bed_match.group(1))
        elif "studio" in title.lower():
            bedrooms = 0

    # Bathrooms (WC/toilet)
    bathrooms = None
    bath_el = card.select_one("span.re__card-config-toilet span")
    if bath_el:
        try:
            bathrooms = int(bath_el.get_text(strip=True))
        except (ValueError, TypeError):
            pass

    # Location (district, city)
    location = ""
    loc_el = card.select_one("div.re__card-location span")
    if loc_el:
        location = loc_el.get_text(strip=True)

    # Description
    desc_el = card.select_one("div.re__card-description")
    description = desc_el.get_text(strip=True) if desc_el else None

    # Images — from img tags inside re__card-image, use data-img or src
    images = []
    img_container = card.select_one("div.re__card-image")
    if img_container:
        for img in img_container.select("img"):
            img_url = img.get("data-img") or img.get("src") or ""
            if img_url and "batdongsan.com.vn" in img_url:
                # Convert crop/thumbnail URLs to larger versions
                large_url = re.sub(r"/crop/\d+x\d+/", "/crop/750x500/", img_url)
                images.append(large_url)

    # Also get the preview image from card's prav attribute
    prav = card.get("prav", "")
    if prav and "batdongsan.com.vn" in prav and prav not in images:
        large_prav = re.sub(r"/crop/\d+x\d+/", "/crop/750x500/", prav)
        images.insert(0, large_prav)

    # Deduplicate images while preserving order
    seen_imgs = set()
    unique_images = []
    for img_url in images:
        if img_url not in seen_imgs:
            seen_imgs.add(img_url)
            unique_images.append(img_url)
    images = unique_images[:20]

    thumbnail = images[0] if images else None

    # Build full text for analysis
    full_text = f"{title} {description or ''} {location} {href}"

    # Address: use the URL path to extract street/ward info + location text
    # The href often contains street and ward info like:
    # /cho-thue-can-ho-chung-cu-duong-tran-hung-dao-phuong-an-hai-nam-the-monarchy/...
    full_address = location  # start with district info
    street_from_url = extract_address_from_url(href)
    if street_from_url:
        full_address = f"{street_from_url}, {location}" if location else street_from_url

    # Area classification
    area_info = classify_area(f"{full_address} {title}")
    area_name = area_info["name"] if area_info else None

    # No coordinates from listing cards (would need detail page fetch)
    lat = None
    lon = None

    # If we classified area but have no coords, use area center
    if area_name and not lat and area_info:
        lat = area_info["center_lat"]
        lon = area_info["center_lon"]

    # Building detection
    building = detect_building(full_text)

    # Property type
    property_type = detect_property_type(full_text, category["prop_type"])

    # Amenities & furnished status
    amenities = detect_amenities(full_text)
    furnished = detect_furnished(full_text)

    # Phone from title/description
    phone = extract_phone(full_text)

    # Build raw data dict for storage
    raw_data = {
        "prid": source_id,
        "title": title,
        "price_text": price_text,
        "area_text": area_text,
        "location": location,
        "href": href,
        "description": description,
        "images": images,
    }

    listing = {
        "id": str(uuid.uuid4()),
        "source_platform": "batdongsan",
        "source_url": source_url,
        "source_id": str(source_id),
        "title": title,
        "description": description,
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
        "images": json.dumps(images),
        "thumbnail_url": thumbnail,
        "is_active": True,
        "is_verified": False,
        "is_duplicate": False,
        "source_raw_data": json.dumps(raw_data, ensure_ascii=False, default=str),
    }

    listing["quality_score"] = compute_quality_score(listing)

    return listing


def extract_address_from_url(href: str) -> str | None:
    """
    Extract street and ward from BDS URL path.

    Example: /cho-thue-can-ho-chung-cu-duong-tran-hung-dao-phuong-an-hai-nam-the-monarchy/...
    -> "duong Tran Hung Dao, phuong An Hai Nam"
    """
    if not href:
        return None

    # Get the first path segment (category + location info)
    parts = href.strip("/").split("/")
    if not parts:
        return None

    path = parts[0]

    # Extract street: "duong-tran-hung-dao" -> "Tran Hung Dao"
    street = None
    street_match = re.search(r"duong-([a-z0-9-]+?)(?:-phuong-|-prj-|-$)", path)
    if street_match:
        street_raw = street_match.group(1)
        street = street_raw.replace("-", " ").title()

    # Extract ward: "phuong-an-hai-nam" -> "An Hai Nam"
    ward = None
    ward_match = re.search(r"phuong-([a-z0-9-]+?)(?:-prj-|-[a-z]+-[a-z]+$|$)", path)
    if ward_match:
        ward_raw = ward_match.group(1)
        # Clean up: remove project suffixes
        ward_raw = re.sub(r"-(?:prj|the|khu|du).*$", "", ward_raw)
        ward = ward_raw.replace("-", " ").title()

    result_parts = []
    if street:
        result_parts.append(f"Duong {street}")
    if ward:
        result_parts.append(f"Phuong {ward}")

    return ", ".join(result_parts) if result_parts else None


def fetch_detail_coords(client: httpx.Client, url: str) -> tuple[float | None, float | None]:
    """
    Fetch a detail page and extract lat/lng from embedded JavaScript.
    Returns (latitude, longitude) or (None, None).
    """
    try:
        resp = client.get(url, timeout=15, follow_redirects=True)
        if resp.status_code != 200:
            return None, None

        # Look for latitude/longitude in JavaScript
        lat_match = re.search(r"latitude:\s*([\d.]+)", resp.text)
        lon_match = re.search(r"longitude:\s*([\d.]+)", resp.text)

        if lat_match and lon_match:
            lat = float(lat_match.group(1))
            lon = float(lon_match.group(1))
            # Sanity check: should be in Da Nang area
            if 15.9 <= lat <= 16.2 and 108.0 <= lon <= 108.4:
                return lat, lon
    except Exception as e:
        logger.debug(f"  Detail fetch failed: {e}")

    return None, None


# -- Database Insert ----------------------------------------------------------

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
                   WHERE source_platform = 'batdongsan'
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
                   WHERE source_platform = 'batdongsan'
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


# -- Main ---------------------------------------------------------------------

def main():
    logger.info("=" * 60)
    logger.info("Bat Dong San Scraper -- Da Nang Rentals")
    logger.info("=" * 60)

    client = httpx.Client(headers=HEADERS, follow_redirects=True)

    all_listings = []

    for cat in CATEGORIES:
        logger.info(f"\nFetching {cat['label']} ({cat['path']})...")

        for page in range(1, MAX_PAGES_PER_CATEGORY + 1):
            # Build URL: page 1 has no suffix, page 2+ uses /p{N}
            if page == 1:
                url = f"{BASE_URL}{cat['path']}"
            else:
                url = f"{BASE_URL}{cat['path']}/p{page}"

            logger.info(f"  Page {page}: {url}")

            html = fetch_listing_page(client, url)
            if not html:
                logger.warning(f"  Failed to fetch page {page}, stopping category")
                break

            cards = parse_cards_from_html(html, cat)
            logger.info(f"  Page {page}: parsed {len(cards)} listings")

            if not cards:
                logger.info(f"  No more listings for {cat['label']}")
                break

            all_listings.extend(cards)

            # Random delay between page fetches (2-5 seconds)
            delay = random.uniform(2.0, 5.0)
            logger.debug(f"  Sleeping {delay:.1f}s...")
            time.sleep(delay)

    client.close()

    logger.info(f"\nTotal listings parsed: {len(all_listings)}")

    # Stats
    with_price = sum(1 for l in all_listings if l["price_vnd"])
    with_area = sum(1 for l in all_listings if l["area_name"])
    with_coords = sum(1 for l in all_listings if l["latitude"])
    with_images = sum(1 for l in all_listings if l["images"] != "[]")
    with_building = sum(1 for l in all_listings if l["building_name"])
    with_bedrooms = sum(1 for l in all_listings if l["bedrooms"] is not None)

    logger.info(f"  With price: {with_price}")
    logger.info(f"  With area classified: {with_area}")
    logger.info(f"  With coordinates: {with_coords}")
    logger.info(f"  With images: {with_images}")
    logger.info(f"  With building name: {with_building}")
    logger.info(f"  With bedrooms: {with_bedrooms}")

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
        cur.execute("SELECT COUNT(*) FROM listings WHERE is_active = true")
        total = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(*) FROM listings WHERE is_active = true AND source_platform = 'batdongsan'"
        )
        bds_total = cur.fetchone()[0]
        cur.execute(
            "SELECT area_name, COUNT(*) FROM listings WHERE is_active = true AND source_platform = 'batdongsan' AND area_name IS NOT NULL GROUP BY area_name ORDER BY COUNT(*) DESC"
        )
        area_breakdown = cur.fetchall()
        cur.close()
        conn.close()

        logger.info(f"\nDatabase now has {total} total active listings ({bds_total} from batdongsan)")
        if area_breakdown:
            logger.info("Area breakdown (batdongsan):")
            for area_name, count in area_breakdown:
                logger.info(f"  {area_name}: {count}")
    except Exception as e:
        logger.error(f"DB verification error: {e}")

    logger.info("\nDone!")


if __name__ == "__main__":
    main()
