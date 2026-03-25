from fastapi import APIRouter, Query
from database import get_cursor
from models import NeighborhoodResponse

router = APIRouter(prefix="/v1/neighborhoods", tags=["Neighborhoods"])


@router.get("", response_model=list[NeighborhoodResponse])
def get_neighborhoods(
    city: str = Query("danang", description="City name"),
):
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.name, a.name_vn, a.slug, a.district,
                   a.description_en, a.avg_price_1br, a.avg_price_2br,
                   a.lifestyle_tags, a.center_lat, a.center_lon,
                   (SELECT COUNT(*) FROM listings l
                    WHERE l.area_name = a.name
                      AND l.is_active = true
                      AND l.is_duplicate = false) AS active_listing_count
            FROM areas a
            ORDER BY a.name
            """
        )
        rows = cur.fetchall()

    return [NeighborhoodResponse(**dict(row)) for row in rows]


@router.get("/{slug}", response_model=NeighborhoodResponse)
def get_neighborhood(slug: str):
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.name, a.name_vn, a.slug, a.district,
                   a.description_en, a.avg_price_1br, a.avg_price_2br,
                   a.lifestyle_tags, a.center_lat, a.center_lon,
                   (SELECT COUNT(*) FROM listings l
                    WHERE l.area_name = a.name
                      AND l.is_active = true
                      AND l.is_duplicate = false) AS active_listing_count
            FROM areas a
            WHERE a.slug = %s
            """,
            (slug,),
        )
        row = cur.fetchone()

    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Neighborhood not found")

    return NeighborhoodResponse(**dict(row))
