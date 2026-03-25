from fastapi import APIRouter, Query
from database import get_cursor
from models import TrendResponse, TrendPoint

router = APIRouter(prefix="/v1/trends", tags=["Trends"])


@router.get("", response_model=TrendResponse)
def get_trends(
    city: str = Query("danang", description="City name"),
    neighborhood: str | None = Query(None, description="Area name filter"),
    period: str = Query("90d", description="30d, 90d, 6m, 1y"),
    property_type: str | None = Query(None, description="Property type filter"),
):
    period_map = {"30d": 30, "90d": 90, "6m": 180, "1y": 365}
    days = period_map.get(period, 90)

    conditions = ["snapshot_date >= CURRENT_DATE - %s"]
    params: list = [days]

    if neighborhood:
        conditions.append("area_name = %s")
        params.append(neighborhood)
    else:
        conditions.append("area_name IS NULL")

    if property_type:
        conditions.append("property_type = %s")
        params.append(property_type)
    else:
        conditions.append("property_type IS NULL")

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        cur.execute(
            f"""
            SELECT snapshot_date, avg_price_vnd, median_price_vnd,
                   active_listings, new_listings
            FROM market_snapshots
            WHERE {where}
            ORDER BY snapshot_date ASC
            """,
            params,
        )
        rows = cur.fetchall()

    data = [
        TrendPoint(
            snapshot_date=row["snapshot_date"],
            avg_price_vnd=row["avg_price_vnd"],
            median_price_vnd=row["median_price_vnd"],
            active_listings=row["active_listings"],
            new_listings=row["new_listings"],
        )
        for row in rows
    ]

    return TrendResponse(
        area_name=neighborhood,
        property_type=property_type,
        period=period,
        data=data,
    )
