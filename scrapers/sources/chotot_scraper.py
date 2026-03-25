"""Cho Tot / Nha Tot scraper — uses public JSON API (no browser needed)."""

import asyncio

import httpx
from loguru import logger

from base_scraper import BaseScraper
from config import Config

# Da Nang = region_v2=3017
# cg=1010 Apartments, 1020 Houses, 1050 Rooms
DANANG_REGION = 3017
CATEGORIES = [
    (1010, "apartments"),
    (1020, "houses"),
    (1050, "rooms"),
]
API_URL = "https://gateway.chotot.com/v1/public/ad-listing"
LISTINGS_PER_PAGE = 50
MAX_PAGES = 10


class ChototScraper(BaseScraper):
    """Scrape rental listings from Cho Tot / Nha Tot via their public API."""

    name = "chotot"
    source_platform = "chotot"

    def __init__(self):
        super().__init__(use_proxy=False)
        self._http = httpx.AsyncClient(
            headers={
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
            },
            timeout=20,
        )

    async def scrape(self) -> list[dict]:
        """Scrape all Da Nang rental categories via API."""
        all_listings = []

        for cg, label in CATEGORIES:
            try:
                listings = await self._scrape_category(cg, label)
                all_listings.extend(listings)
            except Exception as e:
                logger.error(f"[chotot] Failed scraping {label} (cg={cg}): {e}")

        logger.info(f"[chotot] Total listings scraped: {len(all_listings)}")
        return all_listings

    async def _scrape_category(self, cg: int, label: str) -> list[dict]:
        """Scrape a single category via paginated API calls."""
        listings = []

        for page_num in range(MAX_PAGES):
            offset = page_num * LISTINGS_PER_PAGE
            params = {
                "region_v2": DANANG_REGION,
                "cg": cg,
                "limit": LISTINGS_PER_PAGE,
                "o": offset,
            }

            try:
                resp = await self._http.get(API_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.warning(f"[chotot] API page {page_num + 1} failed for {label}: {e}")
                break

            ads = data.get("ads", [])
            if not ads:
                break

            for ad in ads:
                listing = self._transform_ad(ad)
                if listing:
                    listings.append(listing)

            logger.debug(f"[chotot] {label} page {page_num + 1}: {len(ads)} ads")

            # Polite delay
            await asyncio.sleep(1)

        return listings

    def _transform_ad(self, ad: dict) -> dict | None:
        """Transform a ChoTot API ad object into our standard listing format."""
        list_id = ad.get("list_id")
        if not list_id:
            return None

        source_url = f"https://www.nhatot.com/{list_id}.htm"

        # Price
        price_vnd = ad.get("price")
        price_usd = None
        if price_vnd and price_vnd > 0:
            # Filter out "for sale" listings that sneak in (price > 50M VND/month is likely a sale)
            if price_vnd > 50_000_000:
                return None
            price_usd = round(price_vnd / Config.VND_USD_RATE, 2)

        # Images
        images = ad.get("images") or []
        thumbnail = ad.get("thumbnail_image") or (images[0] if images else None)

        # Property type from category
        category = ad.get("category")
        if category == 1010:
            property_type = "apartment"
        elif category == 1020:
            property_type = "house"
        elif category == 1050:
            property_type = "room"
        else:
            property_type = "other"

        # Area mapping
        area_name = ad.get("area_name") or ""

        listing = {
            "source_platform": "chotot",
            "source_url": source_url,
            "source_id": str(list_id),
            "title": (ad.get("subject") or "").strip(),
            "description": (ad.get("body") or "").strip(),
            "raw_text": f"{ad.get('subject', '')} {ad.get('body', '')}".strip(),
            "price_vnd": price_vnd,
            "price_usd": price_usd,
            "bedrooms": ad.get("rooms"),
            "bathrooms": ad.get("toilets"),
            "area_sqm": ad.get("size"),
            "property_type": property_type,
            "address": " ".join(filter(None, [
                ad.get("street_number"),
                ad.get("street_name"),
                ad.get("ward_name"),
                area_name,
            ])),
            "area_name": area_name,
            "latitude": ad.get("latitude"),
            "longitude": ad.get("longitude"),
            "images": images,
            "thumbnail_url": thumbnail,
            "contact_name": ad.get("account_name"),
        }

        return listing

    async def cleanup(self):
        """Close HTTP client."""
        await self._http.aclose()
        await super().cleanup()
