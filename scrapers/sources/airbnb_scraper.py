"""Airbnb scraper — monthly stay listings in Da Nang."""

import json
import re

from loguru import logger
from playwright.async_api import Page

from base_scraper import BaseScraper
from config import Config

# Airbnb search URL for monthly stays in Da Nang
AIRBNB_BASE_URL = (
    "https://www.airbnb.com/s/Da-Nang--Vietnam/homes"
    "?monthly_start_date={start_date}&monthly_length=1"
    "&ne_lat=16.15&ne_lng=108.30&sw_lat=16.00&sw_lng=108.15"
    "&search_type=filter_change&tab_id=home_tab"
)


class AirbnbScraper(BaseScraper):
    """Scrape Airbnb monthly stay listings for Da Nang."""

    name = "airbnb"
    source_platform = "airbnb"

    async def scrape(self) -> list[dict]:
        all_listings = []

        context = await self.launch_browser()
        page = await self.new_page()

        # Enable image loading for Airbnb (need images for listings)
        await self.context.unroute("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}")

        try:
            listings = await self._scrape_search(page)
            all_listings.extend(listings)
        except Exception as e:
            logger.error(f"[airbnb] Scrape failed: {e}")

        logger.info(f"[airbnb] Total listings scraped: {len(all_listings)}")
        return all_listings

    async def _scrape_search(self, page: Page) -> list[dict]:
        """Scrape Airbnb search results."""
        listings = []

        from datetime import datetime, timedelta

        start = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        url = AIRBNB_BASE_URL.format(start_date=start)

        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await self.random_delay(3, 6)

        # Handle cookie consent if present
        consent_btn = await page.query_selector('button[data-testid="accept-btn"], [id*="accept"]')
        if consent_btn:
            await consent_btn.click()
            await self.random_delay(1, 2)

        max_pages = 5
        for page_num in range(max_pages):
            logger.debug(f"[airbnb] Scraping page {page_num + 1}")

            # Wait for listings to load
            await page.wait_for_selector('[itemprop="itemListElement"], [data-testid="card-container"]', timeout=15000)

            # Try to extract from JSON-LD structured data first
            json_listings = await self._extract_from_json_ld(page)
            if json_listings:
                listings.extend(json_listings)
            else:
                # Fallback: extract from DOM
                dom_listings = await self._extract_from_dom(page)
                listings.extend(dom_listings)

            # Check for next page
            next_btn = await page.query_selector('a[aria-label="Next"], [data-testid="pagination-next"]')
            if next_btn:
                await next_btn.click()
                await self.random_delay(3, 6)
            else:
                break

        return listings

    async def _extract_from_json_ld(self, page: Page) -> list[dict]:
        """Try to extract listing data from JSON-LD script tags."""
        listings = []

        scripts = await page.query_selector_all('script[type="application/ld+json"]')
        for script in scripts:
            try:
                text = await script.inner_text()
                data = json.loads(text)

                if isinstance(data, dict) and data.get("@type") == "ItemList":
                    for item in data.get("itemListElement", []):
                        listing = self._parse_json_ld_item(item)
                        if listing:
                            listings.append(listing)
            except Exception:
                continue

        return listings

    def _parse_json_ld_item(self, item: dict) -> dict | None:
        """Parse a single JSON-LD item."""
        url = item.get("url", "")
        if not url:
            return None

        name = item.get("name", "")
        source_id = re.search(r"/rooms/(\d+)", url)

        return {
            "source_platform": "airbnb",
            "source_url": url if url.startswith("http") else f"https://www.airbnb.com{url}",
            "source_id": source_id.group(1) if source_id else None,
            "title": name,
            "raw_text": name,
            "images": [],
        }

    async def _extract_from_dom(self, page: Page) -> list[dict]:
        """Extract listing data from DOM elements."""
        listings = []

        cards = await page.query_selector_all(
            '[itemprop="itemListElement"], [data-testid="card-container"], '
            '[class*="listing-card"]'
        )

        for card in cards:
            try:
                listing = await self._extract_card(card)
                if listing:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"[airbnb] Card extraction error: {e}")

        return listings

    async def _extract_card(self, card) -> dict | None:
        """Extract data from an Airbnb listing card."""
        # Link
        link_el = await card.query_selector('a[href*="/rooms/"]')
        if not link_el:
            return None

        href = await link_el.get_attribute("href")
        source_id = re.search(r"/rooms/(\d+)", href)

        # Title
        title_el = await card.query_selector('[data-testid="listing-card-title"], [id*="title"]')
        title = await title_el.inner_text() if title_el else ""

        # Price
        price_el = await card.query_selector('[class*="price"], span._1y74zjx')
        price_text = await price_el.inner_text() if price_el else ""

        # Subtitle (property type, beds, etc.)
        subtitle_el = await card.query_selector('[data-testid="listing-card-subtitle"]')
        subtitle = await subtitle_el.inner_text() if subtitle_el else ""

        # Images
        images = []
        img_els = await card.query_selector_all("img[src*='muscache']")
        for img in img_els:
            src = await img.get_attribute("src")
            if src:
                images.append(src)

        # Parse price
        price_data = self._parse_price(price_text)

        # Parse bedrooms from subtitle
        bedrooms = None
        br_match = re.search(r"(\d+)\s*bedroom", subtitle, re.IGNORECASE)
        if br_match:
            bedrooms = int(br_match.group(1))
        elif "studio" in subtitle.lower():
            bedrooms = 0

        listing = {
            "source_platform": "airbnb",
            "source_url": f"https://www.airbnb.com{href}" if href.startswith("/") else href,
            "source_id": source_id.group(1) if source_id else None,
            "title": title.strip(),
            "raw_text": f"{title} {subtitle} {price_text}".strip(),
            "images": images,
        }

        if price_data:
            listing.update(price_data)
        if bedrooms is not None:
            listing["bedrooms"] = bedrooms

        return listing

    def _parse_price(self, text: str) -> dict | None:
        """Parse Airbnb price text (usually in USD for monthly)."""
        if not text:
            return None

        # "$1,234/month" or "$1,234 monthly"
        match = re.search(r"\$\s*([\d,]+)", text)
        if match:
            price_usd = float(match.group(1).replace(",", ""))
            # Airbnb sometimes shows per-night; if > $100, assume monthly
            if price_usd > 100:
                return {
                    "price_usd": price_usd,
                    "price_vnd": int(price_usd * Config.VND_USD_RATE),
                }
            else:
                # Per-night → monthly estimate (30 days)
                monthly = price_usd * 30
                return {
                    "price_usd": monthly,
                    "price_vnd": int(monthly * Config.VND_USD_RATE),
                }

        # VND price
        match = re.search(r"₫\s*([\d,.]+)", text)
        if match:
            price_vnd = int(match.group(1).replace(",", "").replace(".", ""))
            return {
                "price_vnd": price_vnd,
                "price_usd": round(price_vnd / Config.VND_USD_RATE, 2),
            }

        return None
