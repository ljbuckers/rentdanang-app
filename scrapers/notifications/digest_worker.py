"""Digest worker: sends batched notifications for daily/weekly saved searches.

Run via scheduler (cron or APScheduler):
  - Daily at 9am: process daily subscribers
  - Weekly on Monday 9am: process weekly subscribers
"""

import json

import psycopg2
import psycopg2.extras
from loguru import logger

from config import Config
from notifications.dispatcher import dispatch_notification


def process_digests(frequency: str = "daily"):
    """Process digest queue for given frequency and send batched notifications."""
    conn = psycopg2.connect(Config.DATABASE_URL)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get saved searches with the matching frequency that have queued items
        cur.execute(
            """SELECT DISTINCT ss.id AS search_id, ss.user_id, ss.name,
                      ss.notify_email, ss.notify_sms, ss.notify_whatsapp,
                      u.email, u.name AS user_name, u.phone, u.whatsapp_enabled
               FROM saved_searches ss
               JOIN users u ON u.id = ss.user_id
               JOIN digest_queue dq ON dq.saved_search_id = ss.id
               WHERE ss.alert_frequency = %s AND ss.alert_enabled = true""",
            (frequency,),
        )
        searches = cur.fetchall()

        if not searches:
            logger.info(f"[digest] No {frequency} digests to process")
            return

        for search in searches:
            # Get queued listings for this search
            cur.execute(
                """SELECT dq.listing_id, l.title_en, l.area_name, l.price_vnd,
                          l.price_usd, l.bedrooms, l.property_type,
                          l.thumbnail_url, l.images
                   FROM digest_queue dq
                   JOIN listings l ON l.id = dq.listing_id
                   WHERE dq.saved_search_id = %s
                   ORDER BY dq.queued_at DESC""",
                (search["search_id"],),
            )
            listings = cur.fetchall()

            if not listings:
                continue

            logger.info(
                f"[digest] Sending {frequency} digest for search '{search['name']}' "
                f"({len(listings)} listings) to {search['email']}"
            )

            # For now, dispatch individual notifications for each listing
            # A future enhancement could batch these into a single digest email
            for listing_row in listings:
                listing_data = {
                    "listing_id": str(listing_row["listing_id"]),
                    "title": listing_row.get("title_en") or "New listing",
                    "area_name": listing_row.get("area_name"),
                    "price_vnd": listing_row.get("price_vnd"),
                    "price_usd": listing_row.get("price_usd"),
                    "bedrooms": listing_row.get("bedrooms"),
                    "property_type": listing_row.get("property_type"),
                    "first_image": listing_row.get("thumbnail_url"),
                }
                dispatch_notification(conn, dict(search), listing_data)

            # Clear processed items from digest queue
            cur.execute(
                "DELETE FROM digest_queue WHERE saved_search_id = %s",
                (search["search_id"],),
            )
            conn.commit()

            # Update last_alerted_at
            cur.execute(
                "UPDATE saved_searches SET last_alerted_at = NOW() WHERE id = %s",
                (search["search_id"],),
            )
            conn.commit()

        cur.close()
        logger.info(f"[digest] Processed {len(searches)} {frequency} digests")

    except Exception as e:
        logger.error(f"[digest] Error processing {frequency} digests: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    import sys

    freq = sys.argv[1] if len(sys.argv) > 1 else "daily"
    logger.info(f"[digest] Running {freq} digest worker")
    process_digests(freq)
