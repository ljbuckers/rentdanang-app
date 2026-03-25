"""
DotProperty Scraper implementation for the Scraper Manager.
"""

import httpx
import re
import random
import time
import json
from loguru import logger
from bs4 import BeautifulSoup

from base_scraper import BaseScraper
from config import Config

# ── Config & Helpers (Ported from scrape_dotproperty.py) ────────────────────

VND_USD_RATE = 25500
SEARCH_URL = "https://www.dotproperty.com.vn/en/properties-for-rent/%C4%91%C3%A0-n%E1%BA%B5ng"
MAX_PAGES = 10

AREA_CLASSIFICATION = [
    {"name": "An Thuong / My An", "keywords": ["an thượng", "an thuong", "mỹ an", "my an", "mỹ khê", "my khe", "ngũ hành sơn", "ngu hanh son", "khuê mỹ", "khue my"]},
    {"name": "Son Tra", "keywords": ["sơn trà", "son tra", "an hải", "an hai", "phước mỹ", "phuoc my", "mân thái", "man thai", "thọ quang", "tho quang", "nại hiên", "nai hien"]},
    {"name": "Hai Chau (Downtown)", "keywords": ["hải châu", "hai chau", "thạch thang", "thach thang", "thanh bình", "thanh binh", "thuận phước", "thuan phuoc", "hòa cường", "hoa cuong", "nam dương", "nam duong", "bình hiên", "binh hien", "bình thuận", "binh thuan", "hòa thuận", "hoa thuan", "phước ninh", "phuoc ninh", "trung tâm"]},
    {"name": "Ngu Hanh Son (Marble Mountains)", "keywords": ["ngũ hành sơn", "ngu hanh son", "hòa hải", "hoa hai", "hòa quý", "hoa quy", "non nước", "non nuoc", "marble mountain"]},
    {"name": "Lien Chieu (North)", "keywords": ["liên chiểu", "lien chieu", "hòa khánh", "hoa khanh", "hòa minh", "hoa minh", "hòa hiệp", "hoa hiep"]},
]

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

def parse_price_vnd(price_text: str) -> int | None:
    if not price_text: return None
    text = price_text.strip()
    m = re.search(r"([\d.,]+)\s*(?:triệu|tri[eê]u|million)", text, re.IGNORECASE)
    if m:
        try: return int(float(m.group(1).replace(",", ".")) * 1_000_000)
        except: pass
    m = re.search(r"([\d][\d.,]*[\d])", text)
    if m:
        num_str = m.group(1)
        if re.match(r"^\d{1,3}(,\d{3})+$", num_str): return int(num_str.replace(",", ""))
        elif re.match(r"^\d{1,3}(\.\d{3})+$", num_str): return int(num_str.replace(".", ""))
        else:
            try: return int(num_str.replace(",", "").replace(".", ""))
            except: pass
    return None

class DotPropertyScraper(BaseScraper):
    name = "DotProperty Scraper"
    source_platform = "dotproperty"

    def __init__(self):
        super().__init__(use_proxy=True) # Use proxy to avoid blocks
        
    async def scrape(self) -> list[dict]:
        """Scrape listings from DotProperty using XHR JSON trick."""
        listings = []
        client = httpx.Client(
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://www.dotproperty.com.vn/en/properties-for-rent/",
            },
            follow_redirects=True,
            timeout=30.0
        )

        try:
            for page in range(1, MAX_PAGES + 1):
                logger.info(f"[{self.name}] Fetching page {page}/{MAX_PAGES}...")
                
                # Fetch JSON
                try:
                    resp = client.get(SEARCH_URL, params={"page": page})
                    resp.raise_for_status()
                    data = resp.json()
                except Exception as e:
                    logger.error(f"[{self.name}] Failed to fetch page {page}: {e}")
                    continue

                html_content = data.get("content", "")
                if not html_content:
                    logger.warning(f"[{self.name}] No content on page {page}")
                    break

                # Parse HTML
                soup = BeautifulSoup(html_content, "html.parser")
                cards = soup.select("[data-uuid]") or soup.select("article.search-result")
                
                if not cards:
                    logger.warning(f"[{self.name}] No cards found on page {page}")
                    break

                for card in cards:
                    item = self._parse_card(card)
                    if item:
                        listings.append(item)
                        self.listings_found += 1

                # Stop if last page
                total = data.get("properties_total", 0)
                if total > 0 and page * 25 >= total:
                    break
                
                time.sleep(random.uniform(2, 4))

        finally:
            client.close()

        logger.info(f"[{self.name}] Extracted {len(listings)} listings")
        return listings

    def _parse_card(self, card) -> dict | None:
        """Parse a single listing card into the format Normalizer expects."""
        source_id = card.get("data-uuid", "").strip()
        if not source_id:
            link = card.select_one("a[href]")
            if link:
                m = re.search(r"-(\d+)(?:\.html)?$", link.get("href", ""))
                if m: source_id = m.group(1)
        
        if not source_id: return None

        # Title & URL
        title_el = card.select_one("h2 a, h3 a, .listing-title a") or card.select_one("a[href]")
        title = title_el.get_text(strip=True) if title_el else ""
        url = title_el.get("href", "") if title_el else ""
        if url and not url.startswith("http"):
            url = f"https://www.dotproperty.com.vn{url}"

        # Price
        price_el = card.select_one("[class*='price'], [class*='Price'], .listing-price, span[class*='amount']")
        price_text = price_el.get_text(strip=True) if price_el else ""
        price_vnd = parse_price_vnd(price_text)
        
        # Skip sales
        if price_vnd and price_vnd > 500_000_000: return None 
        price_usd = round(price_vnd / VND_USD_RATE, 2) if price_vnd else None

        # Attributes
        card_text = card.get_text(" ", strip=True)
        
        bedrooms = None
        bed_match = re.search(r"(\d+)\s*(?:bed|BR|phòng ngủ|PN)", card_text, re.IGNORECASE)
        if bed_match: bedrooms = int(bed_match.group(1))
        elif "studio" in card_text.lower(): bedrooms = 0

        bathrooms = None
        bath_match = re.search(r"(\d+)\s*(?:bath|BA|WC)", card_text, re.IGNORECASE)
        if bath_match: bathrooms = int(bath_match.group(1))

        area_sqm = None
        area_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:m²|m2|sqm)", card_text, re.IGNORECASE)
        if area_match: area_sqm = float(area_match.group(1))

        # Images
        images = []
        for img in card.select("img[data-src], img[data-lazy-src], img[src]"):
            src = img.get("data-src") or img.get("data-lazy-src") or img.get("src")
            if src and not src.startswith("data:") and "placeholder" not in src:
                images.append(src)
        
        # Address/Location
        addr_el = card.select_one("[class*='location'], [class*='address']")
        address = addr_el.get_text(strip=True) if addr_el else ""

        # Construct raw object for Normalizer
        return {
            "source_platform": "dotproperty",
            "source_id": source_id,
            "source_url": url,
            "title": title,
            "raw_text": card_text, # Description equivalent
            "address": address,
            "images": images[:20],
            "price_vnd": price_vnd,
            "price_usd": price_usd,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "area_sqm": area_sqm,
            "latitude": float(card["data-lat"]) if card.get("data-lat") else None,
            "longitude": float(card["data-lon"]) if card.get("data-lon") else None,
        }
