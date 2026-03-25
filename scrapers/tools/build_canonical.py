#!/usr/bin/env python3
"""Build canonical property records from all active listings.

Run after AI extraction backfill to create the canonical property registry.

Usage:
    # Full build (truncates and rebuilds)
    python tools/build_canonical.py

    # Limit for testing
    python tools/build_canonical.py --limit 100

    # Show stats only
    python tools/build_canonical.py --stats
"""

import argparse
import asyncio
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras
from loguru import logger

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from processing.canonical_builder import CanonicalBuilder

logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")


def show_stats():
    """Show current canonical property stats."""
    conn = psycopg2.connect(Config.DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("SELECT COUNT(*) as total FROM canonical_properties")
    total = cur.fetchone()["total"]

    if total == 0:
        logger.info("No canonical properties built yet. Run: python tools/build_canonical.py")
        cur.close()
        conn.close()
        return

    cur.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE source_count > 1) as multi_source,
            COUNT(*) FILTER (WHERE source_count >= 3) as three_plus_sources,
            COUNT(*) FILTER (WHERE confidence_score >= 0.7) as high_confidence,
            COUNT(*) FILTER (WHERE confidence_score < 0.3) as low_confidence,
            COUNT(*) FILTER (WHERE building_name IS NOT NULL) as has_building,
            COUNT(*) FILTER (WHERE latitude IS NOT NULL) as has_location,
            COUNT(*) FILTER (WHERE price_vnd_monthly IS NOT NULL AND price_vnd_monthly > 0) as has_price,
            COUNT(*) FILTER (WHERE bedrooms IS NOT NULL) as has_bedrooms,
            COUNT(*) FILTER (WHERE area_name IS NOT NULL) as has_area,
            ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence,
            ROUND(AVG(source_count)::numeric, 1) as avg_sources
        FROM canonical_properties
        WHERE is_active = true
    """)
    stats = cur.fetchone()

    logger.info("=" * 50)
    logger.info("CANONICAL PROPERTIES STATS")
    logger.info("=" * 50)
    logger.info(f"  Total properties:     {stats['total']}")
    logger.info(f"  Multi-source:         {stats['multi_source']} ({_pct(stats['multi_source'], stats['total'])}%)")
    logger.info(f"  3+ sources:           {stats['three_plus_sources']}")
    logger.info(f"  High confidence (≥0.7): {stats['high_confidence']} ({_pct(stats['high_confidence'], stats['total'])}%)")
    logger.info(f"  Low confidence (<0.3):  {stats['low_confidence']}")
    logger.info(f"  Has building:         {stats['has_building']} ({_pct(stats['has_building'], stats['total'])}%)")
    logger.info(f"  Has location:         {stats['has_location']} ({_pct(stats['has_location'], stats['total'])}%)")
    logger.info(f"  Has price:            {stats['has_price']} ({_pct(stats['has_price'], stats['total'])}%)")
    logger.info(f"  Has bedrooms:         {stats['has_bedrooms']} ({_pct(stats['has_bedrooms'], stats['total'])}%)")
    logger.info(f"  Has area:             {stats['has_area']} ({_pct(stats['has_area'], stats['total'])}%)")
    logger.info(f"  Avg confidence:       {stats['avg_confidence']}")
    logger.info(f"  Avg sources/property: {stats['avg_sources']}")
    logger.info("=" * 50)

    # Top buildings
    cur.execute("""
        SELECT building_name, COUNT(*) as cnt, ROUND(AVG(source_count)::numeric, 1) as avg_src
        FROM canonical_properties
        WHERE building_name IS NOT NULL AND is_active = true
        GROUP BY building_name
        ORDER BY cnt DESC
        LIMIT 10
    """)
    buildings = cur.fetchall()
    if buildings:
        logger.info("\nTop buildings:")
        for b in buildings:
            logger.info(f"  {b['building_name']}: {b['cnt']} properties (avg {b['avg_src']} sources)")

    cur.close()
    conn.close()


def _pct(part, total):
    return round(100 * part / max(total, 1))


async def main():
    parser = argparse.ArgumentParser(description="Build canonical property records")
    parser.add_argument("--limit", type=int, help="Max groups to process")
    parser.add_argument("--stats", action="store_true", help="Show stats only")
    args = parser.parse_args()

    if args.stats:
        show_stats()
        return

    builder = CanonicalBuilder()
    try:
        saved = await builder.build_all(limit=args.limit)
        logger.info(f"Built {saved} canonical properties")
        show_stats()
    finally:
        builder.close()


if __name__ == "__main__":
    asyncio.run(main())
