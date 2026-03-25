"""Abstract base scraper with Playwright browser, proxy rotation, rate limiting, and retry logic."""

import abc
import asyncio
import json
import random
import uuid
from datetime import datetime, timezone

import redis
from loguru import logger
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from tenacity import retry, stop_after_attempt, wait_exponential

from config import Config
from utils.anti_detection import get_stealth_args, get_random_viewport
from utils.proxy_manager import ProxyManager


class BaseScraper(abc.ABC):
    """Abstract base class for all scrapers."""

    name: str = "base"
    source_platform: str = "unknown"

    def __init__(self, use_proxy: bool = True):
        self.use_proxy = use_proxy
        self.proxy_manager = ProxyManager()
        self.redis_client = redis.from_url(Config.REDIS_URL)
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.job_id: str | None = None
        self.listings_found = 0
        self.listings_new = 0

    async def launch_browser(self, headless: bool = True) -> BrowserContext:
        """Launch a stealth Playwright browser with optional proxy."""
        pw = await async_playwright().start()

        launch_args = get_stealth_args()
        proxy_config = None

        if self.use_proxy:
            proxy_info = self.proxy_manager.get_proxy_dict()
            if proxy_info:
                proxy_config = proxy_info

        self.browser = await pw.chromium.launch(
            headless=headless,
            args=launch_args,
        )

        viewport = get_random_viewport()
        self.context = await self.browser.new_context(
            viewport=viewport,
            locale="vi-VN",
            timezone_id="Asia/Ho_Chi_Minh",
            proxy=proxy_config,
        )

        # Block unnecessary resources for speed
        await self.context.route(
            "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}",
            lambda route: route.abort(),
        )

        return self.context

    async def new_page(self) -> Page:
        """Create a new page in the current browser context."""
        if not self.context:
            await self.launch_browser()
        return await self.context.new_page()

    async def random_delay(self, min_sec: float = None, max_sec: float = None):
        """Human-like random delay."""
        min_s = min_sec or Config.MIN_DELAY
        max_s = max_sec or Config.MAX_DELAY
        delay = random.uniform(min_s, max_s)
        await asyncio.sleep(delay)

    async def human_scroll(self, page: Page, scroll_count: int = 1):
        """Simulate human-like scrolling."""
        for _ in range(scroll_count):
            scroll_amount = random.randint(300, 700)
            await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
            await self.random_delay(1, 3)

    def push_to_queue(self, listing_data: dict):
        """Push a raw listing to the Redis processing queue."""
        listing_data["_scraped_at"] = datetime.now(timezone.utc).isoformat()
        listing_data["_source_platform"] = self.source_platform
        listing_data["_job_id"] = self.job_id

        self.redis_client.lpush(
            "rentdanang:listings:raw",
            json.dumps(listing_data, ensure_ascii=False),
        )
        self.listings_found += 1
        logger.debug(f"[{self.name}] Pushed listing to queue (total: {self.listings_found})")

    def log_job_start(self):
        """Log scrape job start to Redis for the API to read."""
        self.job_id = str(uuid.uuid4())
        job = {
            "id": self.job_id,
            "source_platform": self.source_platform,
            "status": "running",
            "listings_found": 0,
            "listings_new": 0,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "error_message": None,
        }
        self.redis_client.hset(f"rentdanang:jobs:{self.job_id}", mapping={
            k: json.dumps(v) if isinstance(v, (dict, list)) else str(v) if v is not None else ""
            for k, v in job.items()
        })
        self.redis_client.lpush("rentdanang:jobs:recent", self.job_id)
        self.redis_client.ltrim("rentdanang:jobs:recent", 0, 99)
        logger.info(f"[{self.name}] Job {self.job_id} started")

    def log_job_complete(self, error: str | None = None):
        """Log scrape job completion."""
        status = "failed" if error else "completed"
        self.redis_client.hset(f"rentdanang:jobs:{self.job_id}", mapping={
            "status": status,
            "listings_found": str(self.listings_found),
            "listings_new": str(self.listings_new),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "error_message": error or "",
        })
        # Track consecutive failures for health monitoring
        fail_key = f"rentdanang:failures:{self.source_platform}"
        if error:
            self.redis_client.incr(fail_key)
            logger.error(f"[{self.name}] Job {self.job_id} failed: {error}")
        else:
            self.redis_client.delete(fail_key)
            logger.info(
                f"[{self.name}] Job {self.job_id} completed: "
                f"{self.listings_found} found, {self.listings_new} new"
            )

    @abc.abstractmethod
    async def scrape(self) -> list[dict]:
        """Execute the scraping logic. Must be implemented by subclasses."""
        ...

    @retry(stop=stop_after_attempt(Config.MAX_RETRIES), wait=wait_exponential(multiplier=1, min=4, max=60))
    async def run(self):
        """Run the scraper with retry logic and job tracking."""
        self.listings_found = 0
        self.listings_new = 0
        self.log_job_start()

        try:
            listings = await self.scrape()
            for listing in listings:
                self.push_to_queue(listing)
            self.log_job_complete()
        except Exception as e:
            self.log_job_complete(error=str(e))
            raise
        finally:
            await self.cleanup()

    async def cleanup(self):
        """Close browser resources."""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        self.context = None
        self.browser = None
