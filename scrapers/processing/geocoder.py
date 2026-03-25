"""Geocoding service using Google Maps API with caching."""

import hashlib
import json

import httpx
import redis
from loguru import logger

from config import Config

# Da Nang bounding box for validation
DANANG_BOUNDS = {
    "south": 15.95,
    "north": 16.20,
    "west": 108.10,
    "east": 108.35,
}

# Area polygons (simplified bounding boxes for classification)
AREA_BOUNDS = {
    "an-thuong": {"south": 16.03, "north": 16.06, "west": 108.23, "east": 108.26},
    "son-tra": {"south": 16.06, "north": 16.15, "west": 108.22, "east": 108.34},
    "hai-chau": {"south": 16.04, "north": 16.08, "west": 108.20, "east": 108.23},
    "ngu-hanh-son": {"south": 15.98, "north": 16.03, "west": 108.23, "east": 108.28},
    "lien-chieu": {"south": 16.06, "north": 16.12, "west": 108.12, "east": 108.18},
}

AREA_NAMES = {
    "an-thuong": "An Thuong / My An",
    "son-tra": "Son Tra",
    "hai-chau": "Hai Chau (Downtown)",
    "ngu-hanh-son": "Ngu Hanh Son (Marble Mountains)",
    "lien-chieu": "Lien Chieu (North)",
}


class Geocoder:
    """Geocode addresses to lat/lon using Google Maps API with Redis caching."""

    def __init__(self):
        self.redis_client = redis.from_url(Config.REDIS_URL)
        self.api_key = Config.GOOGLE_MAPS_API_KEY

    def _cache_key(self, address: str) -> str:
        addr_hash = hashlib.md5(address.lower().strip().encode()).hexdigest()
        return f"rentdanang:geocode:{addr_hash}"

    def geocode(self, address: str) -> dict | None:
        """Geocode an address to lat/lon. Returns dict with lat, lon, formatted_address or None."""
        if not address or not address.strip():
            return None

        # Append "Da Nang, Vietnam" if not already present
        addr = address.strip()
        if "da nang" not in addr.lower() and "đà nẵng" not in addr.lower():
            addr = f"{addr}, Da Nang, Vietnam"

        # Check cache
        cache_key = self._cache_key(addr)
        cached = self.redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

        if not self.api_key:
            logger.warning("Google Maps API key not configured")
            return None

        try:
            response = httpx.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": addr, "key": self.api_key, "region": "vn"},
                timeout=10,
            )
            data = response.json()

            if data["status"] == "OK" and data["results"]:
                location = data["results"][0]["geometry"]["location"]
                lat = location["lat"]
                lon = location["lng"]

                # Validate within Da Nang bounds
                if not self._in_danang(lat, lon):
                    logger.warning(f"Geocoded location outside Da Nang: {lat}, {lon} for '{address}'")
                    return None

                result = {
                    "latitude": lat,
                    "longitude": lon,
                    "formatted_address": data["results"][0].get("formatted_address", ""),
                }

                # Cache for 90 days
                self.redis_client.setex(cache_key, 60 * 60 * 24 * 90, json.dumps(result))
                return result
            else:
                logger.debug(f"Geocoding failed for '{address}': {data.get('status')}")
                return None

        except Exception as e:
            logger.error(f"Geocoding error for '{address}': {e}")
            return None

    def _in_danang(self, lat: float, lon: float) -> bool:
        """Check if coordinates fall within Da Nang bounds."""
        return (
            DANANG_BOUNDS["south"] <= lat <= DANANG_BOUNDS["north"]
            and DANANG_BOUNDS["west"] <= lon <= DANANG_BOUNDS["east"]
        )

    def classify_area(self, lat: float, lon: float) -> dict:
        """Classify coordinates into one of the 5 Da Nang areas."""
        for slug, bounds in AREA_BOUNDS.items():
            if (
                bounds["south"] <= lat <= bounds["north"]
                and bounds["west"] <= lon <= bounds["east"]
            ):
                return {"area_slug": slug, "area_name": AREA_NAMES[slug]}

        # If not in any defined area, find the closest
        import math

        area_centers = {
            "an-thuong": (16.0466, 108.2432),
            "son-tra": (16.1000, 108.2500),
            "hai-chau": (16.0678, 108.2208),
            "ngu-hanh-son": (16.0200, 108.2500),
            "lien-chieu": (16.0900, 108.1500),
        }

        closest_slug = None
        closest_dist = float("inf")
        for slug, (clat, clon) in area_centers.items():
            dist = math.sqrt((lat - clat) ** 2 + (lon - clon) ** 2)
            if dist < closest_dist:
                closest_dist = dist
                closest_slug = slug

        return {"area_slug": closest_slug, "area_name": AREA_NAMES.get(closest_slug, "Unknown")}

    def geocode_from_building(self, building_name: str) -> dict | None:
        """Geocode using known_buildings table first, then Google API fallback."""
        if not building_name:
            return None

        # Check known_buildings table (free, instant, no API call)
        try:
            import psycopg2
            conn = psycopg2.connect(Config.DATABASE_URL)
            cur = conn.cursor()
            # Match by name or alias (case-insensitive)
            cur.execute("""
                SELECT latitude, longitude, name FROM known_buildings
                WHERE latitude IS NOT NULL
                  AND (lower(name) = lower(%s)
                       OR EXISTS (
                           SELECT 1 FROM jsonb_array_elements_text(aliases) a
                           WHERE lower(a) = lower(%s)
                       ))
                LIMIT 1
            """, (building_name, building_name))
            row = cur.fetchone()
            conn.close()

            if row:
                return {
                    "latitude": float(row[0]),
                    "longitude": float(row[1]),
                    "formatted_address": f"{row[2]}, Da Nang, Vietnam",
                }
        except Exception as e:
            logger.debug(f"Known buildings lookup failed: {e}")

        # Fallback to Google API
        return self.geocode(f"{building_name}, Da Nang, Vietnam")
