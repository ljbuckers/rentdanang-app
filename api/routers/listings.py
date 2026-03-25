from fastapi import APIRouter, Query
from database import get_cursor
from models import ListingResponse, PaginatedListings

router = APIRouter(prefix="/v1/listings", tags=["Listings"])


@router.get("", response_model=PaginatedListings)
def get_listings(
    city: str = Query("danang", description="City name"),
    min_price: int | None = Query(None, description="Minimum price in VND"),
    max_price: int | None = Query(None, description="Maximum price in VND"),
    bedrooms: int | None = Query(None, description="Number of bedrooms"),
    property_type: str | None = Query(
        None, description="apartment, house, villa, studio"
    ),
    source: str | None = Query(
        None, description="chotot, fazwaz, dotproperty, facebook, batdongsan"
    ),
    sort_by: str = Query(
        "newest", description="price_asc, price_desc, newest, oldest"
    ),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    conditions = ["l.is_active = true", "l.is_duplicate = false"]
    params: list = []

    if min_price is not None:
        conditions.append("l.price_vnd >= %s")
        params.append(min_price)
    if max_price is not None:
        conditions.append("l.price_vnd <= %s")
        params.append(max_price)
    if bedrooms is not None:
        conditions.append("l.bedrooms = %s")
        params.append(bedrooms)
    if property_type is not None:
        conditions.append("l.property_type = %s")
        params.append(property_type)
    if source is not None:
        conditions.append("l.source_platform = %s")
        params.append(source)

    where = " AND ".join(conditions)

    sort_map = {
        "price_asc": "l.price_vnd ASC NULLS LAST",
        "price_desc": "l.price_vnd DESC NULLS LAST",
        "newest": "l.first_seen_at DESC",
        "oldest": "l.first_seen_at ASC",
    }
    order = sort_map.get(sort_by, "l.first_seen_at DESC")
    offset = (page - 1) * per_page

    with get_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) AS total FROM listings l WHERE {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(
            f"""
            SELECT l.id, l.title, l.title_en, l.property_type, l.bedrooms,
                   l.bathrooms, l.area_sqm, l.price_vnd, l.price_usd,
                   l.price_period, l.area_name, l.district, l.latitude,
                   l.longitude, l.images, l.amenities, l.source_platform,
                   l.source_url, l.furnished, l.available_from,
                   l.contact_phone, l.contact_type, l.first_seen_at, l.is_active
            FROM listings l
            WHERE {where}
            ORDER BY {order}
            LIMIT %s OFFSET %s
            """,
            params + [per_page, offset],
        )
        rows = cur.fetchall()

    listings = [ListingResponse(**{k: (str(v) if k == "id" else v) for k, v in row.items()}) for row in rows]

    return PaginatedListings(data=listings, page=page, per_page=per_page, total=total)


@router.get("/{listing_id}", response_model=ListingResponse)
def get_listing(listing_id: str):
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT l.id, l.title, l.title_en, l.property_type, l.bedrooms,
                   l.bathrooms, l.area_sqm, l.price_vnd, l.price_usd,
                   l.price_period, l.area_name, l.district, l.latitude,
                   l.longitude, l.images, l.amenities, l.source_platform,
                   l.source_url, l.furnished, l.available_from,
                   l.contact_phone, l.contact_type, l.first_seen_at, l.is_active
            FROM listings l
            WHERE l.id = %s
            """,
            (listing_id,),
        )
        row = cur.fetchone()

    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Listing not found")

    return ListingResponse(**{k: (str(v) if k == "id" else v) for k, v in row.items()})
