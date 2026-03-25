"""
FazWaz Scraper implementation for the Scraper Manager.
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

# ── Config (Ported from scrape_fazwaz.py) ───────────────────────────────────

VND_USD_RATE = 25500
BASE_URL = "https://www.fazwaz.vn/property-for-rent/vietnam/da-nang"
MAX_PAGES = 10

class FazWazScraper(BaseScraper):
    name = "FazWaz Scraper"
    source_platform = "fazwaz"

    def __init__(self):
        super().__init__(use_proxy=True)

    async def scrape(self) -> list[dict]:
        """Scrape listings from FazWaz."""
        listings = []
        client = httpx.Client(
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            },
            follow_redirects=True,
            timeout=30.0
        )

        try:
            for page in range(1, MAX_PAGES + 1):
                logger.info(f"[{self.name}] Fetching page {page}...")
                try:
                    resp = client.get(BASE_URL, params={"page": page})
                    resp.raise_for_status()
                except Exception as e:
                    logger.error(f"[{self.name}] Failed to fetch page {page}: {e}")
                    continue

                items = self._parse_page(resp.text)
                if not items:
                    logger.warning(f"[{self.name}] No items found on page {page}")
                    break
                
                listings.extend(items)
                self.listings_found += len(items)
                
                time.sleep(random.uniform(2, 4))

        finally:
            client.close()

        logger.info(f"[{self.name}] Extracted {len(listings)} listings")
        return listings

    def _parse_page(self, html: str) -> list[dict]:
        """Parse listings from HTML using JSON-LD and onmouseenter card data."""
        soup = BeautifulSoup(html, "html.parser")
        items = {}

        # 1. Parse JSON-LD (structured data)
        # FazWaz uses a flat array of schema.org objects (not ItemList wrapper)
        scripts = soup.find_all("script", type="application/ld+json")
        for script in scripts:
            try:
                data = json.loads(script.string)

                # Handle both formats: flat array or ItemList wrapper
                entries = []
                if isinstance(data, list):
                    entries = [d for d in data if d.get("@type") in (
                        "SingleFamilyResidence", "Apartment", "House", "Residence")]
                elif isinstance(data, dict) and data.get("@type") == "ItemList":
                    entries = [e.get("item", e) for e in data.get("itemListElement", [])]

                for item in entries:
                    url = item.get("url", "")
                    # Extract ID from URL pattern: -u1234567 or -1234567
                    match = re.search(r"[u-](\d{5,})$", url.rstrip("/"))
                    if not match:
                        continue
                    source_id = match.group(1)

                    address = item.get("address", {})
                    if isinstance(address, str):
                        street = address
                    else:
                        street = address.get("streetAddress") or address.get("addressLocality", "")

                    items[source_id] = {
                        "source_platform": "fazwaz",
                        "source_id": source_id,
                        "source_url": url,
                        "title": item.get("name"),
                        "address": street,
                        "latitude": float(item.get("geo", {}).get("latitude", 0) or 0),
                        "longitude": float(item.get("geo", {}).get("longitude", 0) or 0),
                        "bedrooms": int(item.get("numberOfRooms", 0) or 0),
                        "area_sqm": float(item.get("floorSize", {}).get("value", 0) or 0),
                        "images": [item.get("image")] if item.get("image") else [],
                    }
            except Exception as e:
                logger.debug(f"[{self.name}] JSON-LD parse error: {e}")

        # 2. Parse onmouseenter card JSON for price, property type, bathrooms
        cards = soup.find_all(attrs={"onmouseenter": True})
        for card in cards:
            raw = card.get("onmouseenter", "")
            match = re.search(r"({.*})", raw)
            if not match:
                continue
            try:
                card_data = json.loads(match.group(1))
            except Exception:
                continue

            card_url = card_data.get("detailUrl", "")
            id_match = re.search(r"[u-](\d{5,})$", card_url.rstrip("/"))
            if not id_match:
                continue
            source_id = id_match.group(1)

            # Merge into existing item or create new
            if source_id not in items:
                items[source_id] = {
                    "source_platform": "fazwaz",
                    "source_id": source_id,
                    "source_url": card_url,
                    "title": card_data.get("name"),
                    "address": card_data.get("formatted_address"),
                    "images": [card_data.get("thumbnail")] if card_data.get("thumbnail") else [],
                }

            item = items[source_id]
            item.setdefault("title", card_data.get("name"))
            item.setdefault("address", card_data.get("formatted_address"))

            # Price: FazWaz shows "$120/mo" or "฿4,500/mo" or "₫12,000,000/mo"
            price_str = card_data.get("price", "")
            if price_str:
                # Extract numeric value
                cleaned = re.sub(r"[^\d.]", "", price_str.split("/")[0])
                if cleaned:
                    price_val = float(cleaned)
                    if "$" in price_str:
                        item["price_usd"] = round(price_val, 2)
                        item["price_vnd"] = int(price_val * VND_USD_RATE)
                    elif "₫" in price_str or "VND" in price_str.upper():
                        item["price_vnd"] = int(price_val)
                        item["price_usd"] = round(price_val / VND_USD_RATE, 2)
                    else:
                        # Default assume USD for FazWaz
                        item["price_usd"] = round(price_val, 2)
                        item["price_vnd"] = int(price_val * VND_USD_RATE)

            if card_data.get("bedrooms"):
                try:
                    item["bedrooms"] = int(card_data["bedrooms"])
                except (ValueError, TypeError):
                    # "Studio" or other non-numeric values
                    if str(card_data["bedrooms"]).lower() == "studio":
                        item["bedrooms"] = 0
                        item.setdefault("property_type", "studio")
            if card_data.get("bathrooms"):
                try:
                    item["bathrooms"] = int(card_data["bathrooms"])
                except (ValueError, TypeError):
                    pass
            if card_data.get("propertyType"):
                item["property_type"] = card_data["propertyType"].lower()

            # Parse area from "51.10 SqM" format
            area_str = card_data.get("area", "")
            if area_str:
                area_match = re.search(r"([\d.]+)", area_str)
                if area_match:
                    item["area_sqm"] = float(area_match.group(1))

        logger.info(f"[{self.name}] Parsed {len(items)} listings from page")
        return list(items.values())
