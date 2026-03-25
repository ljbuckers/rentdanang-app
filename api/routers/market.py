from fastapi import APIRouter, Query
from database import get_cursor
from models import MarketStats

router = APIRouter(prefix="/v1/market", tags=["Market"])


@router.get("/stats", response_model=MarketStats)
def get_market_stats(
    city: str = Query("danang", description="City name"),
    period: str = Query("30d", description="7d, 30d, 90d, 1y"),
):
    period_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = period_map.get(period, 30)

    with get_cursor() as cur:
        # Overall stats from live listings
        cur.execute(
            """
            SELECT COUNT(*) AS active_listings,
                   AVG(price_vnd)::bigint AS avg_price_vnd,
                   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_vnd)::bigint AS median_price_vnd,
                   MIN(price_vnd) AS min_price_vnd,
                   MAX(price_vnd) AS max_price_vnd,
                   AVG(CASE WHEN area_sqm > 0 THEN price_vnd / area_sqm END)::bigint AS avg_price_per_sqm
            FROM listings
            WHERE is_active = true
              AND is_duplicate = false
              AND price_vnd IS NOT NULL
              AND first_seen_at >= NOW() - INTERVAL '%s days'
            """,
            (days,),
        )
        overall = cur.fetchone()

        # Breakdown by property type
        cur.execute(
            """
            SELECT property_type,
                   COUNT(*) AS count,
                   AVG(price_vnd)::bigint AS avg_price_vnd,
                   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_vnd)::bigint AS median_price_vnd
            FROM listings
            WHERE is_active = true
              AND is_duplicate = false
              AND price_vnd IS NOT NULL
              AND first_seen_at >= NOW() - INTERVAL '%s days'
            GROUP BY property_type
            ORDER BY count DESC
            """,
            (days,),
        )
        by_type = [dict(row) for row in cur.fetchall()]

        # Breakdown by area
        cur.execute(
            """
            SELECT area_name,
                   COUNT(*) AS count,
                   AVG(price_vnd)::bigint AS avg_price_vnd,
                   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_vnd)::bigint AS median_price_vnd
            FROM listings
            WHERE is_active = true
              AND is_duplicate = false
              AND price_vnd IS NOT NULL
              AND area_name IS NOT NULL
              AND first_seen_at >= NOW() - INTERVAL '%s days'
            GROUP BY area_name
            ORDER BY count DESC
            """,
            (days,),
        )
        by_area = [dict(row) for row in cur.fetchall()]

    return MarketStats(
        period=period,
        active_listings=overall["active_listings"] or 0,
        avg_price_vnd=overall["avg_price_vnd"],
        median_price_vnd=overall["median_price_vnd"],
        min_price_vnd=overall["min_price_vnd"],
        max_price_vnd=overall["max_price_vnd"],
        avg_price_per_sqm=overall["avg_price_per_sqm"],
        breakdown_by_type=by_type,
        breakdown_by_area=by_area,
    )
