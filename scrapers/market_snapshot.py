"""
Daily Market Snapshot — Aggregates listing statistics into market_snapshots table.

Designed to run daily via cron (e.g. 4am, after health checker).
Captures active listing counts, new/deactivated counts, and price stats
broken down by area and property type.

Usage:
    python market_snapshot.py
    python market_snapshot.py --date 2026-02-15
"""

import argparse
import sys
from datetime import date, timedelta

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
    "logs/market_snapshot_{time:YYYY-MM-DD}.log",
    level="DEBUG",
    rotation="1 day",
    retention="30 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<7} | {message}",
)

# ── Config ───────────────────────────────────────────────────────────────────

from config import Config

DB_URL = Config.DATABASE_URL

# ── Snapshot Logic ───────────────────────────────────────────────────────────

UPSERT_SNAPSHOT_SQL = """
INSERT INTO market_snapshots (
    snapshot_date, area_name, property_type,
    active_listings, new_listings, deactivated_listings,
    avg_price_vnd, median_price_vnd, min_price_vnd, max_price_vnd,
    avg_price_per_sqm
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (snapshot_date, COALESCE(area_name, ''), COALESCE(property_type, ''))
DO UPDATE SET
    active_listings = EXCLUDED.active_listings,
    new_listings = EXCLUDED.new_listings,
    deactivated_listings = EXCLUDED.deactivated_listings,
    avg_price_vnd = EXCLUDED.avg_price_vnd,
    median_price_vnd = EXCLUDED.median_price_vnd,
    min_price_vnd = EXCLUDED.min_price_vnd,
    max_price_vnd = EXCLUDED.max_price_vnd,
    avg_price_per_sqm = EXCLUDED.avg_price_per_sqm
"""


def generate_snapshots(conn, snapshot_date: date):
    """
    Generate market snapshots for the given date.

    Creates rows for:
    - City-wide totals (area_name=NULL, property_type=NULL)
    - Per-area totals (property_type=NULL)
    - Per-property-type totals (area_name=NULL)
    - Per-area + per-property-type breakdown
    """
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get distinct areas and property types that have active listings
    cur.execute("SELECT DISTINCT area_name FROM listings WHERE is_active = true AND area_name IS NOT NULL")
    areas = [row["area_name"] for row in cur.fetchall()]

    cur.execute("SELECT DISTINCT property_type FROM listings WHERE is_active = true AND property_type IS NOT NULL")
    property_types = [row["property_type"] for row in cur.fetchall()]

    # Build dimension combinations: (area, property_type)
    # NULL means "all" for that dimension
    combos = [(None, None)]  # city-wide
    combos += [(a, None) for a in areas]  # per-area
    combos += [(None, pt) for pt in property_types]  # per-type
    combos += [(a, pt) for a in areas for pt in property_types]  # full breakdown

    inserted = 0
    write_cur = conn.cursor()

    for area, ptype in combos:
        stats = _compute_stats(cur, snapshot_date, area, ptype)
        if stats is None:
            continue

        write_cur.execute(
            UPSERT_SNAPSHOT_SQL,
            (
                snapshot_date,
                area,
                ptype,
                stats["active_listings"],
                stats["new_listings"],
                stats["deactivated_listings"],
                stats["avg_price_vnd"],
                stats["median_price_vnd"],
                stats["min_price_vnd"],
                stats["max_price_vnd"],
                stats["avg_price_per_sqm"],
            ),
        )
        inserted += 1

    conn.commit()
    cur.close()
    write_cur.close()
    return inserted


def _compute_stats(cur, snapshot_date: date, area: str | None, ptype: str | None) -> dict | None:
    """Compute stats for one (area, property_type) combination."""

    # Build WHERE clause fragments for area/type filtering
    filters = []
    params = []
    if area is not None:
        filters.append("area_name = %s")
        params.append(area)
    if ptype is not None:
        filters.append("property_type = %s")
        params.append(ptype)

    where = " AND ".join(filters) if filters else "TRUE"

    # Active listings count
    cur.execute(f"SELECT COUNT(*) AS cnt FROM listings WHERE is_active = true AND {where}", params)
    active = cur.fetchone()["cnt"]

    # Skip combos with zero active listings
    if active == 0:
        return None

    # New listings that day (first_seen_at on snapshot_date)
    cur.execute(
        f"""SELECT COUNT(*) AS cnt FROM listings
            WHERE first_seen_at::date = %s AND {where}""",
        [snapshot_date] + params,
    )
    new = cur.fetchone()["cnt"]

    # Deactivated that day
    cur.execute(
        f"""SELECT COUNT(*) AS cnt FROM listings
            WHERE deactivated_at::date = %s AND {where}""",
        [snapshot_date] + params,
    )
    deactivated = cur.fetchone()["cnt"]

    # Price stats (only active listings with a price)
    cur.execute(
        f"""SELECT
                AVG(price_vnd)::BIGINT AS avg_price,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_vnd)::BIGINT AS median_price,
                MIN(price_vnd) AS min_price,
                MAX(price_vnd) AS max_price
            FROM listings
            WHERE is_active = true AND price_vnd IS NOT NULL AND price_vnd > 0 AND {where}""",
        params,
    )
    prices = cur.fetchone()

    # Price per sqm (only where both price and area are available)
    cur.execute(
        f"""SELECT AVG(price_vnd / area_sqm)::BIGINT AS avg_psm
            FROM listings
            WHERE is_active = true
              AND price_vnd IS NOT NULL AND price_vnd > 0
              AND area_sqm IS NOT NULL AND area_sqm > 0
              AND {where}""",
        params,
    )
    psm = cur.fetchone()

    return {
        "active_listings": active,
        "new_listings": new,
        "deactivated_listings": deactivated,
        "avg_price_vnd": prices["avg_price"],
        "median_price_vnd": prices["median_price"],
        "min_price_vnd": prices["min_price"],
        "max_price_vnd": prices["max_price"],
        "avg_price_per_sqm": psm["avg_psm"] if psm else None,
    }


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate daily market snapshot aggregations.",
    )
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Snapshot date in YYYY-MM-DD format (default: yesterday)",
    )
    args = parser.parse_args()

    snapshot_date = date.fromisoformat(args.date) if args.date else date.today() - timedelta(days=1)

    logger.info("=" * 60)
    logger.info(f"Market Snapshot for {snapshot_date}")
    logger.info("=" * 60)

    try:
        conn = psycopg2.connect(DB_URL)
        logger.info("Connected to PostgreSQL")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return

    try:
        count = generate_snapshots(conn, snapshot_date)
        logger.info(f"Inserted/updated {count} snapshot rows")
    except Exception as e:
        logger.error(f"Failed to generate snapshots: {e}")
        conn.rollback()
    finally:
        conn.close()

    logger.info("Done.")


if __name__ == "__main__":
    main()
