"""Match new listings against saved searches and dispatch notifications.

Subscribes to Redis pub/sub channel `rentdanang:new_listing`.
When a new listing arrives, checks all active saved searches for matches.
Instant alerts are dispatched immediately; daily/weekly go to digest_queue.
"""

import json

import psycopg2
import psycopg2.extras
import redis
from loguru import logger

from config import Config
from notifications.dispatcher import dispatch_notification


def _matches_filters(listing: dict, filters: dict) -> bool:
    """Check if a listing matches a saved search's JSONB filters."""
    # Area filter
    area_names = filters.get("area_names", [])
    if area_names and listing.get("area_name") not in area_names:
        return False

    # Price range
    price = listing.get("price_vnd")
    if price is not None:
        if filters.get("price_min_vnd") and price < filters["price_min_vnd"]:
            return False
        if filters.get("price_max_vnd") and price > filters["price_max_vnd"]:
            return False

    # Bedrooms
    bedrooms = listing.get("bedrooms")
    if bedrooms is not None:
        if filters.get("bedrooms_min") and bedrooms < filters["bedrooms_min"]:
            return False
        if filters.get("bedrooms_max") and bedrooms > filters["bedrooms_max"]:
            return False

    # Property type
    ptypes = filters.get("property_types", [])
    if ptypes and listing.get("property_type") not in ptypes:
        return False

    return True


def _get_matching_searches(conn, listing: dict) -> list[dict]:
    """Find all saved searches that match this listing."""
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """SELECT ss.id, ss.user_id, ss.name, ss.filters,
                  ss.alert_frequency, ss.notify_email, ss.notify_sms, ss.notify_whatsapp,
                  u.email, u.name AS user_name, u.phone, u.whatsapp_enabled
           FROM saved_searches ss
           JOIN users u ON u.id = ss.user_id
           WHERE ss.alert_enabled = true"""
    )
    rows = cur.fetchall()
    cur.close()

    matches = []
    for row in rows:
        filters = row["filters"] if isinstance(row["filters"], dict) else json.loads(row["filters"])
        if _matches_filters(listing, filters):
            matches.append(dict(row))
    return matches


def _queue_for_digest(conn, search_id: str, listing_id: str):
    """Add listing to digest queue for later batch notification."""
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO digest_queue (saved_search_id, listing_id)
           VALUES (%s, %s)
           ON CONFLICT (saved_search_id, listing_id) DO NOTHING""",
        (search_id, listing_id),
    )
    conn.commit()
    cur.close()


def handle_new_listing(message_data: str):
    """Process a new listing event from Redis pub/sub."""
    try:
        listing = json.loads(message_data)
    except (json.JSONDecodeError, TypeError):
        logger.error(f"Invalid message data: {message_data}")
        return

    listing_id = listing.get("listing_id")
    if not listing_id:
        return

    logger.info(
        f"[matcher] New listing: {listing_id} "
        f"area={listing.get('area_name')} price={listing.get('price_vnd')}"
    )

    conn = psycopg2.connect(Config.DATABASE_URL)
    try:
        matches = _get_matching_searches(conn, listing)
        if not matches:
            logger.debug(f"[matcher] No matching searches for listing {listing_id}")
            return

        logger.info(f"[matcher] {len(matches)} saved searches match listing {listing_id}")

        for search in matches:
            if search["alert_frequency"] == "instant":
                dispatch_notification(conn, search, listing)
            else:
                _queue_for_digest(conn, search["id"], listing_id)
                logger.debug(
                    f"[matcher] Queued {listing_id} for {search['alert_frequency']} "
                    f"digest (search={search['id']})"
                )
    except Exception as e:
        logger.error(f"[matcher] Error processing listing {listing_id}: {e}")
    finally:
        conn.close()


def run_matcher():
    """Main entry point: subscribe to Redis and process events."""
    r = redis.from_url(Config.REDIS_URL)
    pubsub = r.pubsub()
    pubsub.subscribe("rentdanang:new_listing")
    logger.info("[matcher] Subscribed to rentdanang:new_listing, waiting for events...")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            handle_new_listing(message["data"])
        except Exception as e:
            logger.error(f"[matcher] Unhandled error: {e}")


if __name__ == "__main__":
    run_matcher()
