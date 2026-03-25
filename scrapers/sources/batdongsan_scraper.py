"""Batdongsan.com.vn scraper — HTML parsing via residential proxy (no browser needed)."""

import asyncio
import re

import httpx
from bs4 import BeautifulSoup
from loguru import logger

from base_scraper import BaseScraper
from config import Config

# Da Nang rental category URLs — page number appended as /p{N}
CATEGORIES = [
    ("cho-thue-can-ho-chung-cu-da-nang", "apartments"),
    ("cho-thue-nha-rieng-da-nang", "houses"),
    ("cho-thue-phong-tro-da-nang", "rooms"),
]
BASE_URL = "https://batdongsan.com.vn"
MAX_PAGES = 8



FLARESOLVERR_URL = "http://localhost:8191/v1"

async def _fetch_via_flaresolverr(url: str, timeout: int = 30) -> str | None:
    """Fetch URL via FlareSolverr to bypass Cloudflare."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                FLARESOLVERR_URL,
                json={"cmd": "request.get", "url": url, "maxTimeout": timeout * 1000},
                timeout=timeout + 15,
            )
            data = resp.json()
            if data.get("status") == "ok" and data.get("solution", {}).get("status") == 200:
                return data["solution"]["response"]
            else:
                logger.warning(f"[batdongsan] FlareSolverr non-ok for {url}")
                return None
    except Exception as e:
        logger.error(f"[batdongsan] FlareSolverr error for {url}: {e}")
        return None

class BatdongsanScraper(BaseScraper):
    """Scrape rental listings from Batdongsan.com.vn via HTML parsing."""

    name = "batdongsan"
    source_platform = "batdongsan"

    def __init__(self):
        super().__init__(use_proxy=True)
        # Build proxy URL from config
        proxy_url = Config.get_proxy_url()
        self._http = httpx.AsyncClient(
            proxy=proxy_url,
            verify=False,  # Bright Data does SSL interception
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                "Referer": "https://batdongsan.com.vn/",
                "Cache-Control": "no-cache",
            },
            timeout=30,
            follow_redirects=True,
        )

    async def scrape(self) -> list[dict]:
        """Scrape all Da Nang rental categories."""
        all_listings = []

        for slug, label in CATEGORIES:
            try:
                listings = await self._scrape_category(slug, label)
                all_listings.extend(listings)
            except Exception as e:
                logger.error(f"[batdongsan] Failed scraping {label}: {e}")

        logger.info(f"[batdongsan] Total listings scraped: {len(all_listings)}")
        return all_listings

    async def _scrape_category(self, slug: str, label: str) -> list[dict]:
        """Scrape a single category via paginated HTML pages."""
        listings = []

        for page_num in range(1, MAX_PAGES + 1):
            if page_num == 1:
                url = f"{BASE_URL}/{slug}"
            else:
                url = f"{BASE_URL}/{slug}/p{page_num}"

            # Try FlareSolverr first (bypasses Cloudflare), fall back to proxy
            html = await _fetch_via_flaresolverr(url)
            if not html:
                try:
                    resp = await self._http.get(url)
                    resp.raise_for_status()
                    html = resp.text
                except Exception as e:
                    logger.warning(f"[batdongsan] Page {page_num} failed for {label}: {e}")
                    break

            # Check for Cloudflare challenge page
            if "Chờ một chút" in html or "Just a moment" in html:
                logger.warning(f"[batdongsan] Cloudflare challenge on {label} page {page_num} — skipping")
                break

            soup = BeautifulSoup(html, "html.parser")
            cards = soup.select(".js__card.re__card-full")

            if not cards:
                # Try alternative selector
                cards = soup.select('[class*="js__card"]')

            if not cards:
                logger.debug(f"[batdongsan] No cards on {label} page {page_num}")
                break

            page_listings = 0
            for card in cards:
                listing = self._extract_card(card, label)
                if listing:
                    listings.append(listing)
                    page_listings += 1

            logger.debug(f"[batdongsan] {label} page {page_num}: {page_listings} listings from {len(cards)} cards")

            # Polite delay between pages
            await asyncio.sleep(2)

        return listings

    def _extract_card(self, card, label: str) -> dict | None:
        """Extract listing data from a BeautifulSoup card element."""
        # Product ID from card attributes
        source_id = card.get("prid")
        if not source_id:
            return None

        # Link with product ID
        link_el = card.select_one("a[data-product-id]")
        if not link_el:
            return None

        href = link_el.get("href", "")
        if not href:
            return None

        source_url = f"{BASE_URL}{href}" if href.startswith("/") else href

        # Title from the span inside h3
        title_el = card.select_one(".pr-title, .js__card-title")
        title = title_el.get_text(strip=True) if title_el else ""

        # Price (single dash, not double)
        price_el = card.select_one(".re__card-config-price")
        price_text = price_el.get_text(strip=True) if price_el else ""

        # Area (sqm)
        area_el = card.select_one(".re__card-config-area")
        area_text = area_el.get_text(strip=True) if area_el else ""

        # Bedrooms
        bedroom_el = card.select_one(".re__card-config-bedroom span")
        bedroom_text = bedroom_el.get_text(strip=True) if bedroom_el else ""

        # Bathrooms / WC
        toilet_el = card.select_one(".re__card-config-toilet span")
        toilet_text = toilet_el.get_text(strip=True) if toilet_el else ""

        # Location
        location_el = card.select_one(".re__card-location span")
        location = location_el.get_text(strip=True) if location_el else ""

        # Description preview
        desc_el = card.select_one(".re__card-description")
        description = desc_el.get_text(strip=True) if desc_el else ""

        # Images
        images = []
        thumbnail = card.get("prav")  # thumbnail URL from card attribute
        if thumbnail:
            # Convert crop URL to full image
            full_img = re.sub(r"/crop/\d+x\d+/", "/resize/1200x-/", thumbnail)
            images.append(full_img)

        # Additional images from img tags
        for img in card.select("img"):
            src = img.get("data-img") or img.get("data-src") or img.get("src") or ""
            if src and "placeholder" not in src and "icon" not in src and src not in images:
                images.append(src)

        # Property type from category label
        if "apartment" in label or "can-ho" in label:
            property_type = "apartment"
        elif "house" in label or "nha" in label:
            property_type = "house"
        elif "room" in label or "phong" in label:
            property_type = "room"
        else:
            property_type = "other"

        # Area name from location (e.g., "Liên Chiểu, Đà Nẵng" → "Liên Chiểu")
        area_name = ""
        if location:
            parts = [p.strip() for p in location.split(",")]
            if len(parts) >= 2:
                area_name = parts[0]  # district/ward name

        listing = {
            "source_platform": "batdongsan",
            "source_url": source_url,
            "source_id": source_id,
            "title": title,
            "description": description,
            "raw_text": f"{title} {description} {price_text} {area_text} {location}",
            "address": location,
            "area_name": area_name,
            "property_type": property_type,
            "images": images,
            "thumbnail_url": thumbnail,
        }

        # Parse price
        price = self._parse_price(price_text)
        if price:
            listing.update(price)

        # Parse area
        area_sqm = self._parse_area(area_text)
        if area_sqm:
            listing["area_sqm"] = area_sqm

        # Parse bedrooms
        bedrooms = self._parse_int(bedroom_text)
        if bedrooms:
            listing["bedrooms"] = bedrooms

        # Parse bathrooms
        bathrooms = self._parse_int(toilet_text)
        if bathrooms:
            listing["bathrooms"] = bathrooms

        return listing

    def _parse_price(self, text: str) -> dict | None:
        if not text:
            return None
        text = text.strip().lower()

        # "12 triệu/tháng" or "12 tr/tháng"
        match = re.search(r"(\d+(?:[.,]\d+)?)\s*(triệu|tr)", text)
        if match:
            price = float(match.group(1).replace(",", "."))
            price_vnd = int(price * 1_000_000)
            return {"price_vnd": price_vnd, "price_usd": round(price_vnd / Config.VND_USD_RATE, 2)}

        # "X đồng/tháng" or "X,000,000 đ"
        match = re.search(r"([\d.]+)\s*đ", text)
        if match:
            price_vnd = int(match.group(1).replace(".", ""))
            return {"price_vnd": price_vnd, "price_usd": round(price_vnd / Config.VND_USD_RATE, 2)}

        return None

    def _parse_area(self, text: str) -> float | None:
        match = re.search(r"(\d+(?:[.,]\d+)?)\s*m", text, re.IGNORECASE)
        return float(match.group(1).replace(",", ".")) if match else None

    def _parse_int(self, text: str) -> int | None:
        match = re.search(r"(\d+)", text)
        return int(match.group(1)) if match else None

    async def cleanup(self):
        """Close HTTP client."""
        await self._http.aclose()
        await super().cleanup()
