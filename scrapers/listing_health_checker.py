"""
Listing Health Checker — Daily background job that verifies active listings
still exist on their source platforms.

Checks source URLs via HTTP and deactivates listings that return 404, 410,
or redirect to homepage/search pages (indicating removal).

Usage:
    python listing_health_checker.py
    python listing_health_checker.py --limit 50
    python listing_health_checker.py --dry-run
"""

import argparse
import random
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
import psycopg2
import psycopg2.extras
from loguru import logger

# ── Logging ──────────────────────────────────────────────────────────────────

logger.remove()
logger.add(
    sys.stderr,
    level="INFO",
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<7}</level> | {message}",
)
logger.add(
    "logs/health_checker_{time:YYYY-MM-DD}.log",
    level="DEBUG",
    rotation="1 day",
    retention="14 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<7} | {message}",
)

# ── Config ───────────────────────────────────────────────────────────────────

from config import Config

DB_URL = Config.DATABASE_URL
DEFAULT_LIMIT = 500
MIN_DELAY = 3
MAX_DELAY = 8
REQUEST_TIMEOUT = 20

# ── Browser Headers ──────────────────────────────────────────────────────────
# Realistic browser headers with Vietnamese locale to avoid bot detection.

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
]


def get_browser_headers() -> dict:
    """Return realistic browser headers with Vietnamese locale."""
    return {
        "User-Agent": random.choice(USER_AGENTS),
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
        "Connection": "keep-alive",
    }


# ── Platform-Specific Redirect Detection ─────────────────────────────────────

# Homepage and search page patterns that indicate a listing was removed.
# When a listing is deleted, many platforms redirect to their homepage or
# a search results page instead of returning a proper 404.

HOMEPAGE_PATTERNS = {
    "chotot": [
        "https://www.nhatot.com/",
        "https://nhatot.com/",
        "https://www.nhatot.com/mua-ban",
        "https://www.nhatot.com/thue",
        "https://www.chotot.com/",
        "https://chotot.com/",
    ],
    "batdongsan": [
        "https://batdongsan.com.vn/",
        "https://www.batdongsan.com.vn/",
        "https://batdongsan.com.vn/nha-dat-cho-thue",
        "https://batdongsan.com.vn/cho-thue",
        "https://batdongsan.com.vn/nha-dat-ban",
    ],
    "dotproperty": [
        "https://www.dotproperty.com.vn/",
        "https://dotproperty.com.vn/",
        "https://www.dotproperty.com.vn/en/",
        "https://www.dotproperty.com.vn/vi/",
    ],
    "fazwaz": [
        "https://www.fazwaz.vn/",
        "https://fazwaz.vn/",
        "https://www.fazwaz.vn/en/",
    ],
}


def is_redirect_to_removed(
    platform: str,
    original_url: str,
    final_url: str,
    status_code: int,
) -> bool:
    """
    Determine if a redirect indicates the listing was removed.

    Many platforms do not return 404 for removed listings. Instead they
    redirect (301/302) to the homepage or a search/category page.
    We detect this by comparing the final URL after redirects to known
    homepage/search patterns.
    """
    if not final_url:
        return False

    original_parsed = urlparse(original_url)
    final_parsed = urlparse(final_url)

    # If the final URL path is just "/" or empty, it is a homepage redirect
    if final_parsed.path in ("", "/"):
        logger.debug(f"  Redirect to homepage root: {final_url}")
        return True

    # Check against known homepage/search patterns for this platform
    patterns = HOMEPAGE_PATTERNS.get(platform, [])
    final_normalized = final_url.rstrip("/")
    for pattern in patterns:
        pattern_normalized = pattern.rstrip("/")
        if final_normalized == pattern_normalized or final_normalized.startswith(pattern_normalized + "?"):
            logger.debug(f"  Redirect matches known removal pattern: {final_url}")
            return True

    # Platform-specific heuristics

    if platform == "chotot":
        # Cho Tot: deleted listings get 301 to homepage.
        # A valid listing URL looks like /12345678.htm
        # If we started with that pattern but ended up somewhere without .htm, it is gone
        if ".htm" in original_parsed.path and ".htm" not in final_parsed.path:
            logger.debug(f"  Cho Tot: lost .htm extension in redirect: {final_url}")
            return True

    elif platform == "batdongsan":
        # BatDongSan: deleted listings redirect to search results or category pages.
        # Valid listing URLs contain a specific slug, e.g. /cho-thue-can-ho-chung-cu/slug-pr12345
        # Category/search pages have paths like /nha-dat-cho-thue or /cho-thue-can-ho
        # If original path is longer/specific and final is a short category, listing is gone
        if original_url != final_url:
            orig_segments = [s for s in original_parsed.path.split("/") if s]
            final_segments = [s for s in final_parsed.path.split("/") if s]
            # Original listing URLs typically have 2+ path segments with a slug
            # Category pages have 1 segment. If we went from 2+ segments to 1, it is removed
            if len(orig_segments) >= 2 and len(final_segments) <= 1:
                logger.debug(f"  BatDongSan: redirect from listing to category page: {final_url}")
                return True
            # Also check if redirected to a search results page (contains query params like page=, sort=)
            if final_parsed.query and any(p in final_parsed.query for p in ["page=", "sort=", "search"]):
                logger.debug(f"  BatDongSan: redirect to search results: {final_url}")
                return True

    elif platform == "dotproperty":
        # DotProperty: removed listings redirect to homepage or search
        if original_url != final_url:
            # If we ended up at a path without the original listing slug
            orig_path_parts = original_parsed.path.strip("/").split("/")
            final_path_parts = final_parsed.path.strip("/").split("/")
            if len(orig_path_parts) >= 2 and len(final_path_parts) <= 1:
                logger.debug(f"  DotProperty: redirect from listing to top-level page: {final_url}")
                return True

    elif platform == "fazwaz":
        # FazWaz: removed listings redirect to homepage or search
        if original_url != final_url:
            orig_path_parts = original_parsed.path.strip("/").split("/")
            final_path_parts = final_parsed.path.strip("/").split("/")
            if len(orig_path_parts) >= 2 and len(final_path_parts) <= 1:
                logger.debug(f"  FazWaz: redirect from listing to top-level page: {final_url}")
                return True

    return False


# ── Listing Checker ──────────────────────────────────────────────────────────

class ListingStatus:
    """Result of checking a single listing."""

    STILL_ACTIVE = "still_active"
    GONE_404 = "gone_404"
    GONE_410 = "gone_410"
    GONE_REDIRECT = "gone_redirect"
    ERROR = "error"


def check_single_listing(
    client: httpx.Client,
    listing_id: str,
    source_url: str,
    platform: str,
) -> tuple[str, str]:
    """
    Check whether a single listing still exists at its source URL.

    Returns:
        (status, detail) where status is a ListingStatus constant and
        detail is a human-readable explanation.
    """
    if not source_url:
        return ListingStatus.ERROR, "No source_url"

    try:
        # Try HEAD first (lighter), fall back to GET if HEAD returns 405 or error
        method = "HEAD"
        try:
            resp = client.head(source_url, timeout=REQUEST_TIMEOUT)
            # Some servers don't support HEAD or return misleading results
            if resp.status_code == 405 or resp.status_code == 403:
                method = "GET"
                resp = client.get(source_url, timeout=REQUEST_TIMEOUT)
        except httpx.HTTPError:
            # HEAD failed, try GET
            method = "GET"
            resp = client.get(source_url, timeout=REQUEST_TIMEOUT)

        status_code = resp.status_code
        final_url = str(resp.url)

        logger.debug(
            f"  [{method}] {source_url} -> {status_code} (final: {final_url})"
        )

        # Definitive removal status codes
        if status_code == 404:
            return ListingStatus.GONE_404, f"HTTP 404 Not Found"

        if status_code == 410:
            return ListingStatus.GONE_410, f"HTTP 410 Gone"

        # Successful response -- but check for deceptive redirects
        if 200 <= status_code < 400:
            if is_redirect_to_removed(platform, source_url, final_url, status_code):
                return (
                    ListingStatus.GONE_REDIRECT,
                    f"Redirected to {final_url} (listing removed)",
                )
            # Listing still exists
            return ListingStatus.STILL_ACTIVE, f"HTTP {status_code} OK"

        # Server errors or unexpected codes -- don't deactivate, just log
        if status_code >= 500:
            return ListingStatus.ERROR, f"Server error HTTP {status_code}"

        # 403 Forbidden -- could be temporary bot block, don't deactivate
        if status_code == 403:
            return ListingStatus.ERROR, f"HTTP 403 Forbidden (possible bot block)"

        # Other client errors (e.g., 400, 401) -- treat as error, don't deactivate
        return ListingStatus.ERROR, f"HTTP {status_code}"

    except httpx.TimeoutException:
        return ListingStatus.ERROR, "Request timed out"
    except httpx.ConnectError as e:
        return ListingStatus.ERROR, f"Connection error: {e}"
    except httpx.HTTPError as e:
        return ListingStatus.ERROR, f"HTTP error: {e}"
    except Exception as e:
        return ListingStatus.ERROR, f"Unexpected error: {e}"


# ── Database Operations ──────────────────────────────────────────────────────

FETCH_STALE_LISTINGS_SQL = """
SELECT id, source_url, source_platform, title, last_seen_at, miss_count
FROM listings
WHERE is_active = true
  AND last_seen_at < NOW() - INTERVAL '3 days'
ORDER BY last_seen_at ASC
LIMIT %s
"""

DEACTIVATE_LISTING_SQL = """
UPDATE listings
SET is_active = false,
    status = 'inactive',
    deactivated_at = NOW(),
    miss_count = COALESCE(miss_count, 0) + 1
WHERE id = %s
"""

LOG_DEACTIVATION_EVENT_SQL = """
INSERT INTO listing_events (listing_id, event_type, reason)
VALUES (%s, 'deactivated', %s)
"""

MARK_STILL_ACTIVE_SQL = """
UPDATE listings
SET last_seen_at = NOW(),
    miss_count = 0
WHERE id = %s
"""

INCREMENT_MISS_COUNT_SQL = """
UPDATE listings
SET miss_count = COALESCE(miss_count, 0) + 1
WHERE id = %s
"""


def fetch_stale_listings(conn, limit: int) -> list[dict]:
    """Fetch active listings that haven't been seen in 3+ days."""
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(FETCH_STALE_LISTINGS_SQL, (limit,))
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]


def deactivate_listing(conn, listing_id: str, reason: str = "unknown"):
    """Mark a listing as no longer active and log the event."""
    cur = conn.cursor()
    cur.execute(DEACTIVATE_LISTING_SQL, (listing_id,))
    cur.execute(LOG_DEACTIVATION_EVENT_SQL, (listing_id, reason))
    conn.commit()
    cur.close()


def mark_still_active(conn, listing_id: str):
    """Update last_seen_at and reset miss_count for a listing that is still live."""
    cur = conn.cursor()
    cur.execute(MARK_STILL_ACTIVE_SQL, (listing_id,))
    conn.commit()
    cur.close()


def increment_miss_count(conn, listing_id: str):
    """Increment miss_count for a listing that had a transient error."""
    cur = conn.cursor()
    cur.execute(INCREMENT_MISS_COUNT_SQL, (listing_id,))
    conn.commit()
    cur.close()


# ── Main ─────────────────────────────────────────────────────────────────────

def run_health_check(limit: int = DEFAULT_LIMIT, dry_run: bool = False):
    """
    Main health check routine.

    Fetches stale active listings from the database, checks each one
    against its source platform, and updates the database accordingly.
    """
    start_time = time.monotonic()

    logger.info("=" * 60)
    logger.info("Listing Health Checker")
    logger.info(f"  Limit: {limit} listings per run")
    logger.info(f"  Dry run: {dry_run}")
    logger.info("=" * 60)

    # Connect to database
    try:
        conn = psycopg2.connect(DB_URL)
        logger.info("Connected to PostgreSQL")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return

    # Fetch stale listings
    listings = fetch_stale_listings(conn, limit)
    total = len(listings)
    logger.info(f"Found {total} stale active listings to check")

    if total == 0:
        logger.info("Nothing to check. All listings are fresh.")
        conn.close()
        return

    # Log platform breakdown
    platform_counts = {}
    for listing in listings:
        p = listing["source_platform"]
        platform_counts[p] = platform_counts.get(p, 0) + 1
    for platform, count in sorted(platform_counts.items()):
        logger.info(f"  {platform}: {count} listings")

    # Create HTTP client with realistic browser headers
    client = httpx.Client(
        headers=get_browser_headers(),
        follow_redirects=True,
        timeout=REQUEST_TIMEOUT,
        # Limit max redirects to catch infinite redirect loops
        max_redirects=10,
    )

    # Counters
    still_active = 0
    deactivated = 0
    errors = 0
    checked = 0

    deactivated_details = []

    try:
        for i, listing in enumerate(listings, 1):
            listing_id = str(listing["id"])
            source_url = listing["source_url"]
            platform = listing["source_platform"]
            title_preview = (listing.get("title") or "")[:50]
            last_seen = listing.get("last_seen_at")
            miss_count = listing.get("miss_count") or 0

            logger.info(
                f"[{i}/{total}] Checking {platform} listing "
                f"(last seen: {last_seen}, misses: {miss_count})"
            )
            logger.debug(f"  URL: {source_url}")
            logger.debug(f"  Title: {title_preview}")

            # Rotate User-Agent periodically to reduce detection risk
            if i % 20 == 0:
                client.headers.update(get_browser_headers())
                logger.debug("  Rotated browser headers")

            # Check the listing
            status, detail = check_single_listing(
                client, listing_id, source_url, platform
            )
            checked += 1

            if status == ListingStatus.STILL_ACTIVE:
                logger.info(f"  -> ACTIVE ({detail})")
                if not dry_run:
                    mark_still_active(conn, listing_id)
                still_active += 1

            elif status in (
                ListingStatus.GONE_404,
                ListingStatus.GONE_410,
                ListingStatus.GONE_REDIRECT,
            ):
                logger.warning(f"  -> REMOVED ({detail})")
                reason = "source_redirect" if status == ListingStatus.GONE_REDIRECT else "source_404"
                if not dry_run:
                    deactivate_listing(conn, listing_id, reason=reason)
                deactivated += 1
                deactivated_details.append({
                    "id": listing_id,
                    "platform": platform,
                    "url": source_url,
                    "reason": detail,
                })

            elif status == ListingStatus.ERROR:
                # If listing has been missed 5+ times and not seen by any scraper
                # in 7+ days, deactivate it. Persistent 403s mean the listing is
                # likely gone or the URL is no longer valid.
                days_stale = (datetime.now(timezone.utc) - last_seen).days if last_seen else 999
                if miss_count >= 5 and days_stale >= 7:
                    logger.warning(f"  -> DEACTIVATING (miss_count={miss_count}, stale {days_stale}d, last error: {detail})")
                    if not dry_run:
                        deactivate_listing(conn, listing_id, reason=f"stale_{days_stale}d_miss{miss_count}_{detail}")
                    deactivated += 1
                else:
                    logger.warning(f"  -> ERROR ({detail}, miss_count={miss_count}, stale {days_stale}d)")
                    if not dry_run:
                        increment_miss_count(conn, listing_id)
                    errors += 1

            # Random delay between requests to be polite to source sites
            if i < total:
                delay = random.uniform(MIN_DELAY, MAX_DELAY)
                logger.debug(f"  Waiting {delay:.1f}s before next check...")
                time.sleep(delay)

    except KeyboardInterrupt:
        logger.warning("Interrupted by user. Saving progress...")
    except Exception as e:
        logger.error(f"Unexpected error during health check: {e}")
    finally:
        client.close()

    # Final summary
    elapsed = time.monotonic() - start_time
    elapsed_min = elapsed / 60

    logger.info("")
    logger.info("=" * 60)
    logger.info("Health Check Summary")
    logger.info("=" * 60)
    logger.info(f"  Total checked:  {checked}/{total}")
    logger.info(f"  Still active:   {still_active}")
    logger.info(f"  Deactivated:    {deactivated}")
    logger.info(f"  Errors/skipped: {errors}")
    logger.info(f"  Duration:       {elapsed_min:.1f} minutes")

    if deactivated_details:
        logger.info("")
        logger.info(f"Deactivated listings ({len(deactivated_details)}):")
        for d in deactivated_details:
            logger.info(f"  [{d['platform']}] {d['url']}")
            logger.info(f"    Reason: {d['reason']}")

    # Log to scrape_jobs table for monitoring
    if not dry_run:
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO scrape_jobs
                   (source_platform, status, listings_found, listings_new,
                    listings_updated, started_at, completed_at, duration_seconds)
                   VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)""",
                (
                    "health_checker",
                    "completed",
                    checked,
                    0,
                    still_active,
                    datetime.now(timezone.utc),
                    int(elapsed),
                ),
            )
            conn.commit()
            cur.close()
            logger.debug("Logged health check run to scrape_jobs")
        except Exception as e:
            logger.warning(f"Failed to log to scrape_jobs: {e}")
            conn.rollback()

    conn.close()
    logger.info("Done.")


# ── CLI Entry Point ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Check if active listings still exist on their source platforms.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Maximum number of listings to check per run (default: {DEFAULT_LIMIT})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Check listings but do not update the database",
    )
    args = parser.parse_args()

    run_health_check(limit=args.limit, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
