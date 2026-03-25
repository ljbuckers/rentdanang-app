from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime


class ListingResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, from_attributes=True)
    id: str
    title: Optional[str] = None
    title_en: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqm: Optional[float] = None
    price_vnd: Optional[int] = None
    price_usd: Optional[float] = None
    price_period: Optional[str] = None
    area_name: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: Optional[list] = None
    amenities: Optional[list] = None
    source_platform: Optional[str] = None
    source_url: Optional[str] = None
    furnished: Optional[str] = None
    available_from: Optional[date] = None
    contact_phone: Optional[str] = None
    contact_type: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class PaginatedListings(BaseModel):
    data: list[ListingResponse]
    page: int
    per_page: int
    total: int


class MarketStats(BaseModel):
    period: str
    active_listings: int
    avg_price_vnd: Optional[int] = None
    median_price_vnd: Optional[int] = None
    min_price_vnd: Optional[int] = None
    max_price_vnd: Optional[int] = None
    avg_price_per_sqm: Optional[int] = None
    breakdown_by_type: Optional[list] = None
    breakdown_by_area: Optional[list] = None


class NeighborhoodResponse(BaseModel):
    id: int
    name: str
    name_vn: Optional[str] = None
    slug: str
    district: Optional[str] = None
    description_en: Optional[str] = None
    avg_price_1br: Optional[int] = None
    avg_price_2br: Optional[int] = None
    lifestyle_tags: Optional[list] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    active_listing_count: Optional[int] = None


class TrendPoint(BaseModel):
    snapshot_date: date
    avg_price_vnd: Optional[int] = None
    median_price_vnd: Optional[int] = None
    active_listings: Optional[int] = None
    new_listings: Optional[int] = None


class TrendResponse(BaseModel):
    area_name: Optional[str] = None
    property_type: Optional[str] = None
    period: str
    data: list[TrendPoint]


class SpatialListing(BaseModel):
    id: str
    title: Optional[str] = None
    title_en: Optional[str] = None
    price_vnd: Optional[int] = None
    price_usd: Optional[float] = None
    bedrooms: Optional[int] = None
    area_sqm: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None
    area_name: Optional[str] = None
    property_type: Optional[str] = None
    source_platform: Optional[str] = None
    images: Optional[list] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
