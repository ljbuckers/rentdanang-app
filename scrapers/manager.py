"""Scraper manager — orchestrates all scrapers with scheduling and health monitoring."""

import asyncio
import json
import signal
import sys
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

import redis
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from loguru import logger

from config import Config
from processing.normalizer import Normalizer
from sources.chotot_scraper import ChototScraper
from sources.batdongsan_scraper import BatdongsanScraper
from sources.facebook_persistent import FacebookPersistentScraper as FacebookScraper, SessionExpiredError
from sources.dotproperty_scraper import DotPropertyScraper
from sources.fazwaz_scraper import FazWazScraper
from sources.airbnb_scraper import AirbnbScraper

# Configure logging
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")
logger.add("logs/scraper_{time:YYYY-MM-DD}.log", rotation="1 day", retention="14 days", level="DEBUG")

# Thread pool for running synchronous tasks (health checker, market snapshot)
_thread_pool = ThreadPoolExecutor(max_workers=2)


class ScraperManager:
    """Orchestrates all scrapers with scheduling and monitoring."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.redis_client = redis.from_url(Config.REDIS_URL)
        self.normalizer = Normalizer()
        self._running = True

    def setup_schedules(self):
        """Configure scraping schedules."""
        # Cho Tot: every hour
        self.scheduler.add_job(
            self._run_scraper,
            "interval",
            hours=1,
            args=[ChototScraper],
            id="chotot",
            name="Cho Tot Scraper",
            max_instances=1,
        )

        # Batdongsan: every hour (via Bright Data residential proxy)
        self.scheduler.add_job(
            self._run_scraper,
            "interval",
            hours=1,
            minutes=15,  # offset to stagger with Cho Tot
            args=[BatdongsanScraper],
            id="batdongsan",
            name="Batdongsan Scraper",
            max_instances=1,
        )
        # PAUSED_FB_WARNING 
        # PAUSED_FB_WARNING         # Facebook: every 2-3 hours (persistent browser via CDP)
        # Facebook: twice daily only (reduced frequency per Lee, FB warning)
        self.scheduler.add_job(
            self._run_scraper,
            "interval",
            hours=12,
            args=[FacebookScraper],
            id="facebook",
            name="Facebook Scraper",
            max_instances=1,
        )

        # DotProperty: every 2 hours
        self.scheduler.add_job(
            self._run_scraper,
            "interval",
            hours=2,
            minutes=30,
            args=[DotPropertyScraper],
            id="dotproperty",
            name="DotProperty Scraper",
            max_instances=1,
        )

        # FazWaz: every 2 hours
        self.scheduler.add_job(
            self._run_scraper,
            "interval",
            hours=2,
            minutes=45,
            args=[FazWazScraper],
            id="fazwaz",
            name="FazWaz Scraper",
            max_instances=1,
        )

        # NOTE: Airbnb disabled — lower priority for local rentals
        # self.scheduler.add_job(
        #     self._run_scraper, "interval", hours=2,
        #     args=[AirbnbScraper], id="airbnb", name="Airbnb Scraper", max_instances=1,
        # )

        # Processing queue consumer: every 30 seconds
        self.scheduler.add_job(
            self._process_queue,
            "interval",
            seconds=30,
            id="processor",
            name="Queue Processor",
            max_instances=1,
        )

        # Health check (internal): every 5 minutes
        self.scheduler.add_job(
            self._health_check,
            "interval",
            minutes=5,
            id="health",
            name="Health Check",
        )

        # Listing health checker: every 6 hours — verifies stale listings still exist
        self.scheduler.add_job(
            self._run_listing_health_check,
            "interval",
            hours=6,
            id="listing_health_checker",
            name="Listing Health Checker",
            max_instances=1,
        )

        # Market snapshot: daily at 4am UTC
        self.scheduler.add_job(
            self._run_market_snapshot,
            "cron",
            hour=4,
            minute=0,
            id="market_snapshot",
            name="Market Snapshot",
            max_instances=1,
        )

        logger.info("Scraper schedules configured")

    async def _run_scraper(self, scraper_class):
        """Run a single scraper with error handling."""
        scraper_name = scraper_class.name if hasattr(scraper_class, 'name') else scraper_class.__name__
        platform = scraper_class.source_platform if hasattr(scraper_class, 'source_platform') else scraper_name
        logger.info(f"Starting scraper: {scraper_name}")

        try:
            scraper = scraper_class()
            await scraper.run()
            # Reset failure counter on success
            self._reset_failures(platform)
        except SessionExpiredError as e:
            # Facebook session expired — don't retry, don't count as failure
            logger.warning(
                f"Facebook session expired: {e} — "
                "run fb_manual_login.py on the VPS to re-login"
            )
        except Exception as e:
            logger.error(f"Scraper {scraper_name} failed: {e}")
            self._record_failure(platform)

    async def _process_queue(self):
        """Process raw listings from the Redis queue."""
        batch_size = 20
        processed = 0

        while processed < batch_size:
            raw_data = self.redis_client.rpop("rentdanang:listings:raw")
            if not raw_data:
                break

            try:
                raw = json.loads(raw_data)
                listing = await self.normalizer.process_raw_listing(raw)
                if listing:
                    saved_id = await self.normalizer.save_listing(listing)
                    if saved_id:
                        processed += 1
                        # Publish event for real-time notifications
                        images = listing.get("images")
                        if isinstance(images, str):
                            try:
                                images = json.loads(images)
                            except (json.JSONDecodeError, TypeError):
                                images = []
                        self.redis_client.publish("rentdanang:new_listing", json.dumps({
                            "listing_id": saved_id,
                            "source_platform": listing.get("source_platform"),
                            "area_name": listing.get("area_name"),
                            "price_vnd": listing.get("price_vnd"),
                            "price_usd": listing.get("price_usd"),
                            "bedrooms": listing.get("bedrooms"),
                            "property_type": listing.get("property_type"),
                            "title": (listing.get("title_en") or listing.get("title") or "")[:100],
                            "first_image": images[0] if images else None,
                        }))
            except Exception as e:
                logger.error(f"Failed to process queued listing: {e}")
                # Push to dead letter queue for retry
                self.redis_client.lpush("rentdanang:listings:failed", raw_data)

        if processed > 0:
            logger.info(f"Processed {processed} listings from queue")

    async def _health_check(self):
        """Check scraper health and alert on consecutive failures."""
        platforms = ["chotot", "batdongsan", "airbnb", "facebook"]
        status = {}

        for platform in platforms:
            fail_count = self.redis_client.get(f"rentdanang:failures:{platform}")
            failures = int(fail_count) if fail_count else 0
            status[platform] = {
                "consecutive_failures": failures,
                "healthy": failures < 3,
            }

            if failures >= 3:
                logger.error(f"ALERT: {platform} scraper has failed {failures} times consecutively!")

        # Store health status
        self.redis_client.set(
            "rentdanang:health",
            json.dumps({
                "scrapers": status,
                "queue_size": self.redis_client.llen("rentdanang:listings:raw"),
                "failed_queue_size": self.redis_client.llen("rentdanang:listings:failed"),
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }),
        )

    def _record_failure(self, platform: str):
        """Record a scraper failure for health monitoring."""
        key = f"rentdanang:failures:{platform}"
        self.redis_client.incr(key)

    def _reset_failures(self, platform: str):
        """Reset failure counter after a successful run."""
        key = f"rentdanang:failures:{platform}"
        prev = self.redis_client.get(key)
        if prev and int(prev) > 0:
            logger.info(f"Scraper {platform} recovered after {prev} failures")
        self.redis_client.delete(key)

    async def _run_listing_health_check(self):
        """Run the listing health checker in a thread (it's synchronous)."""
        logger.info("Starting listing health check...")
        try:
            from listing_health_checker import run_health_check
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_thread_pool, run_health_check, 200, False)
            logger.info("Listing health check completed")
        except Exception as e:
            logger.error(f"Listing health check failed: {e}")

    async def _run_market_snapshot(self):
        """Run the daily market snapshot in a thread (it's synchronous)."""
        logger.info("Starting daily market snapshot...")
        try:
            from market_snapshot import generate_snapshots
            import psycopg2
            from datetime import date, timedelta

            def _snapshot():
                conn = psycopg2.connect(Config.DATABASE_URL)
                try:
                    snapshot_date = date.today() - timedelta(days=1)
                    count = generate_snapshots(conn, snapshot_date)
                    logger.info(f"Market snapshot: {count} rows for {snapshot_date}")
                finally:
                    conn.close()

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_thread_pool, _snapshot)
            logger.info("Market snapshot completed")
        except Exception as e:
            logger.error(f"Market snapshot failed: {e}")

    async def start(self):
        """Start the scraper manager."""
        logger.info("RentDaNang Scraper Manager starting...")
        self.setup_schedules()
        self.scheduler.start()

        # Run initial scrapes
        logger.info("Running initial scrape cycle...")
        await asyncio.gather(
            self._run_scraper(ChototScraper),
            self._run_scraper(BatdongsanScraper),
            self._run_scraper(FacebookScraper),
            self._run_scraper(DotPropertyScraper),
            self._run_scraper(FazWazScraper),
            return_exceptions=True,
        )

        # Keep running
        while self._running:
            await asyncio.sleep(1)

    def stop(self):
        """Stop the scraper manager."""
        logger.info("Shutting down scraper manager...")
        self._running = False
        self.scheduler.shutdown()


async def main():
    manager = ScraperManager()

    # Handle shutdown signals
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, manager.stop)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass

    await manager.start()


if __name__ == "__main__":
    asyncio.run(main())
