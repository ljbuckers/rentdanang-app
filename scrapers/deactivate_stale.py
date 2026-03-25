"""
Deactivate stale listings — marks listings as inactive when scrapers
haven't seen them in 14+ days. Data is preserved for historical analysis.

Runs daily via cron or scraper manager.
"""
import sys
import psycopg2
from datetime import datetime, timezone
from loguru import logger

logger.remove()
logger.add(sys.stderr, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level:<7}</level> | {message}")
logger.add("logs/stale_cleanup_{time:YYYY-MM-DD}.log", level="DEBUG", rotation="1 day", retention="14 days")

from config import Config

STALE_THRESHOLD_DAYS = 14

def run_stale_cleanup(threshold_days: int = STALE_THRESHOLD_DAYS, dry_run: bool = False):
    conn = psycopg2.connect(Config.DATABASE_URL)
    cur = conn.cursor()

    # Count what will be deactivated
    cur.execute("""
        SELECT source_platform, count(*)
        FROM listings
        WHERE is_active = true
          AND last_seen_at < NOW() - INTERVAL '%s days'
        GROUP BY source_platform
        ORDER BY count(*) DESC
    """ % threshold_days)
    breakdown = cur.fetchall()
    total = sum(r[1] for r in breakdown)

    if total == 0:
        logger.info(f"No stale listings older than {threshold_days} days. Database is clean.")
        conn.close()
        return 0

    logger.info(f"Found {total} stale active listings (not seen in {threshold_days}+ days):")
    for platform, count in breakdown:
        logger.info(f"  {platform}: {count}")

    if dry_run:
        logger.info("Dry run, no changes made.")
        conn.close()
        return total

    # Deactivate
    cur.execute("""
        UPDATE listings
        SET is_active = false,
            status = 'inactive',
            deactivated_at = NOW()
        WHERE is_active = true
          AND last_seen_at < NOW() - INTERVAL '%s days'
    """ % threshold_days)
    deactivated = cur.rowcount
    conn.commit()

    # Log summary
    cur.execute("""
        SELECT count(*) FILTER (WHERE is_active), count(*) FILTER (WHERE NOT is_active), count(*)
        FROM listings
    """)
    active, inactive, total_all = cur.fetchone()
    logger.info(f"Deactivated {deactivated} listings. Active: {active}, Inactive: {inactive}, Total: {total_all}")

    cur.close()
    conn.close()
    return deactivated

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=int, default=STALE_THRESHOLD_DAYS)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run_stale_cleanup(args.threshold, args.dry_run)
