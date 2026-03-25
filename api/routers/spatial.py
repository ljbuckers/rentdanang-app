from fastapi import APIRouter, Query
from database import get_cursor
from models import SpatialListing

router = APIRouter(prefix="/v1/spatial", tags=["Spatial"])


@router.get("/radius", response_model=list[SpatialListing])
def radius_search(
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    radius_km: float = Query(2.0, ge=0.1, le=50.0, description="Radius in km"),
    min_price: int | None = Query(None, description="Minimum price in VND"),
    max_price: int | None = Query(None, description="Maximum price in VND"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
):
    radius_m = radius_km * 1000

    conditions = [
        "l.is_active = true",
        "l.is_duplicate = false",
        "l.location IS NOT NULL",
        "ST_DWithin(l.location, ST_GeogFromText(%s), %s)",
    ]
    params: list = [f"SRID=4326;POINT({lng} {lat})", radius_m]

    if min_price is not None:
        conditions.append("l.price_vnd >= %s")
        params.append(min_price)
    if max_price is not None:
        conditions.append("l.price_vnd <= %s")
        params.append(max_price)

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        cur.execute(
            f"""
            SELECT l.id, l.title, l.title_en, l.price_vnd, l.price_usd,
                   l.bedrooms, l.area_sqm, l.latitude, l.longitude,
                   l.area_name, l.property_type, l.source_platform, l.images,
                   ST_Distance(l.location, ST_GeogFromText(%s)) / 1000.0 AS distance_km
            FROM listings l
            WHERE {where}
            ORDER BY ST_Distance(l.location, ST_GeogFromText(%s))
            LIMIT %s
            """,
            [f"SRID=4326;POINT({lng} {lat})"]
            + params
            + [f"SRID=4326;POINT({lng} {lat})", limit],
        )
        rows = cur.fetchall()

    def convert(k, v):
        if k == "id":
            return str(v)
        if k == "distance_km" and v is not None:
            return round(v, 3)
        return v

    return [
        SpatialListing(**{k: convert(k, v) for k, v in row.items()})
        for row in rows
    ]
