"""Extract structured listing data from unstructured text using regex + Claude Haiku fallback."""

import json
import re

import anthropic
from loguru import logger

from config import Config

# Known buildings in Da Nang (for matching)
KNOWN_BUILDINGS = [
    "Monarchy", "Azura", "Hiyori Garden Tower", "Hiyori", "Fivitel",
    "Indochina Riverside", "Blooming Tower", "Fusion Suites",
    "Alphanam Luxury", "Danang Daewoo", "Premier Sky Residences", "Premier Sky",
    "Filmore", "Risemount", "Sun Cosmo", "Soleil",
    "F.Home", "FHome", "OceanView", "Ocean View", "Zen Diamond", "Altara Suites", "Altara",
    "The Sang Residence", "The Sang", "Peninsula", "Vinpearl Condotel", "Vinpearl",
    "Samatha", "Green Diamond", "Son Tra Ocean View",
    "Hilton", "Novotel", "Four Points Sheraton", "Four Points",
    "Hyatt Regency", "Hyatt", "Marriott", "Muong Thanh", "Mường Thanh",
    "Hoang Anh Gia Lai", "HAGL", "Da Nang Plaza",
    "Naman Retreat", "Chicland", "Belle Maison",
    "Central Coast", "BRG Diamond", "Wyndham",
    "FPT Plaza", "Thanh Binh Green",
]

# Vietnamese phone format
PHONE_REGEX = re.compile(r"0[3-9]\d[\s.\-]?\d{3}[\s.\-]?\d{3,4}")

# Price patterns
PRICE_PATTERNS = [
    # "12 triệu/tháng", "12tr/tháng", "12 tr"
    re.compile(r"(\d+(?:[.,]\d+)?)\s*(triệu|tr|trieu)\s*(?:/\s*(?:tháng|thang|month|th))?", re.IGNORECASE),
    # "giá 12tr"
    re.compile(r"giá\s*(\d+(?:[.,]\d+)?)\s*(tr|triệu|trieu)", re.IGNORECASE),
    # "$450", "$450/month"
    re.compile(r"\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:/\s*(?:month|mo|tháng))?", re.IGNORECASE),
    # "450 USD", "450usd"
    re.compile(r"(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:USD|usd|dollars?)", re.IGNORECASE),
    # "12,000,000 VND"
    re.compile(r"(\d{1,3}(?:,\d{3})+)\s*(?:VND|vnd|đ|dong)", re.IGNORECASE),
]

# Bedroom patterns
BEDROOM_PATTERNS = [
    re.compile(r"(\d+)\s*(?:PN|pn|phòng ngủ|phong ngu|bedroom|BR|bed|bdr)", re.IGNORECASE),
    re.compile(r"(?:studio)", re.IGNORECASE),
]

# Bathroom patterns
BATHROOM_PATTERNS = [
    re.compile(r"(\d+)\s*(?:WC|wc|toilet|bathroom|bath|VS|vs|phòng tắm)", re.IGNORECASE),
]

# Area (sqm) patterns
AREA_PATTERNS = [
    re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:m2|m²|sqm|mét vuông|met vuong)", re.IGNORECASE),
]

# Floor patterns
FLOOR_PATTERNS = [
    re.compile(r"(?:tầng|tang|floor|tầng\s*số)\s*(\d+)", re.IGNORECASE),
    re.compile(r"(\d+)\s*(?:tầng|tang|floor)\b", re.IGNORECASE),
]

# Furnished status
FURNISHED_PATTERNS = {
    "furnished": re.compile(
        r"full\s*(?:nội thất|noi that|furniture|furnished)|đầy đủ nội thất|fully?\s*furnished",
        re.IGNORECASE,
    ),
    "semi-furnished": re.compile(
        r"(?:semi|nửa|một phần)\s*(?:nội thất|furnished)|bán nội thất",
        re.IGNORECASE,
    ),
    "unfurnished": re.compile(
        r"(?:không|ko)\s*(?:nội thất|furniture)|unfurnished|trống|empty",
        re.IGNORECASE,
    ),
}

# Amenities detection
AMENITY_PATTERNS = {
    "swimming_pool": re.compile(r"hồ bơi|pool|bể bơi|swimming", re.IGNORECASE),
    "gym": re.compile(r"phòng gym|gym|fitness|tập gym", re.IGNORECASE),
    "balcony": re.compile(r"ban công|balcony|bancony", re.IGNORECASE),
    "ocean_view": re.compile(r"view biển|ocean view|sea view|view bien", re.IGNORECASE),
    "river_view": re.compile(r"view sông|river view|view song|view hàn", re.IGNORECASE),
    "parking": re.compile(r"bãi đỗ xe|parking|đậu xe|để xe", re.IGNORECASE),
    "elevator": re.compile(r"thang máy|elevator|lift", re.IGNORECASE),
    "washing_machine": re.compile(r"máy giặt|washing|washer|laundry", re.IGNORECASE),
    "kitchen": re.compile(r"bếp|kitchen|nấu ăn", re.IGNORECASE),
    "air_conditioning": re.compile(r"điều hòa|điều hoà|air\s*con|AC|máy lạnh", re.IGNORECASE),
    "water_heater": re.compile(r"nóng lạnh|water heater|bình nóng", re.IGNORECASE),
    "wifi": re.compile(r"wifi|wi-fi|internet", re.IGNORECASE),
    "cleaning_service": re.compile(r"dọn phòng|cleaning|housekeeping|vệ sinh", re.IGNORECASE),
    "24h_security": re.compile(r"an ninh|security|bảo vệ|24h|24/7", re.IGNORECASE),
    "pet_friendly": re.compile(r"cho nuôi thú|pet|thú cưng|chó mèo|dog|cat", re.IGNORECASE),
}


class Extractor:
    """Extract structured data from listing text using regex patterns + LLM fallback."""

    def __init__(self):
        self._anthropic = None

    @property
    def anthropic_client(self):
        if self._anthropic is None and Config.ANTHROPIC_API_KEY:
            self._anthropic = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
        return self._anthropic

    def extract_phone(self, text: str) -> str | None:
        """Extract Vietnamese phone number from text."""
        match = PHONE_REGEX.search(text)
        if match:
            phone = re.sub(r"[\s.\-]", "", match.group())
            return phone
        return None

    def extract_price(self, text: str) -> dict:
        """Extract price and determine currency."""
        for pattern in PRICE_PATTERNS:
            match = pattern.search(text)
            if match:
                price_str = match.group(1).replace(",", "")
                try:
                    price = float(price_str)
                except ValueError:
                    continue

                full_match = match.group(0).lower()

                # Determine if VND (triệu) or USD
                if any(w in full_match for w in ["triệu", "tr", "trieu"]):
                    return {"price_vnd": int(price * 1_000_000), "price_usd": round(price * 1_000_000 / Config.VND_USD_RATE, 2)}
                elif "$" in full_match or "usd" in full_match or "dollar" in full_match:
                    return {"price_usd": price, "price_vnd": int(price * Config.VND_USD_RATE)}
                elif "vnd" in full_match or "đ" in full_match:
                    return {"price_vnd": int(price), "price_usd": round(price / Config.VND_USD_RATE, 2)}
                else:
                    # Default: if < 100, assume triệu VND
                    if price < 100:
                        return {"price_vnd": int(price * 1_000_000), "price_usd": round(price * 1_000_000 / Config.VND_USD_RATE, 2)}
                    return {"price_vnd": int(price), "price_usd": round(price / Config.VND_USD_RATE, 2)}
        return {}

    def extract_bedrooms(self, text: str) -> int | None:
        """Extract bedroom count."""
        for pattern in BEDROOM_PATTERNS:
            match = pattern.search(text)
            if match:
                if "studio" in match.group(0).lower():
                    return 0  # studio = 0 bedrooms
                return int(match.group(1))
        return None

    def extract_bathrooms(self, text: str) -> int | None:
        """Extract bathroom count."""
        for pattern in BATHROOM_PATTERNS:
            match = pattern.search(text)
            if match:
                return int(match.group(1))
        return None

    def extract_area_sqm(self, text: str) -> float | None:
        """Extract area in square meters."""
        for pattern in AREA_PATTERNS:
            match = pattern.search(text)
            if match:
                area_str = match.group(1).replace(",", ".")
                return float(area_str)
        return None

    def extract_floor(self, text: str) -> int | None:
        """Extract floor number."""
        for pattern in FLOOR_PATTERNS:
            match = pattern.search(text)
            if match:
                return int(match.group(1))
        return None

    def extract_building(self, text: str) -> str | None:
        """Match against known Da Nang building names."""
        text_lower = text.lower()
        for building in KNOWN_BUILDINGS:
            if building.lower() in text_lower:
                return building
        return None

    def extract_furnished(self, text: str) -> str | None:
        """Detect furnished status."""
        for status, pattern in FURNISHED_PATTERNS.items():
            if pattern.search(text):
                return status
        return None

    def extract_amenities(self, text: str) -> list[str]:
        """Extract amenities from text."""
        amenities = []
        for amenity, pattern in AMENITY_PATTERNS.items():
            if pattern.search(text):
                amenities.append(amenity)
        return amenities

    def extract_all_regex(self, text: str) -> dict:
        """Extract all fields using regex patterns."""
        result = {
            "contact_phone": self.extract_phone(text),
            "bedrooms": self.extract_bedrooms(text),
            "bathrooms": self.extract_bathrooms(text),
            "area_sqm": self.extract_area_sqm(text),
            "floor_number": self.extract_floor(text),
            "building_name": self.extract_building(text),
            "furnished": self.extract_furnished(text),
            "amenities": self.extract_amenities(text),
        }

        price_info = self.extract_price(text)
        result.update(price_info)

        # Determine property type from text
        result["property_type"] = self._detect_property_type(text)

        return result

    def _detect_property_type(self, text: str) -> str | None:
        """Detect property type from text."""
        text_lower = text.lower()
        if any(w in text_lower for w in ["studio"]):
            return "studio"
        if any(w in text_lower for w in ["biệt thự", "villa"]):
            return "villa"
        if any(w in text_lower for w in ["nhà nguyên căn", "nhà", "house", "nha nguyen can"]):
            return "house"
        if any(w in text_lower for w in ["phòng trọ", "phong tro", "room"]):
            return "room"
        if any(w in text_lower for w in ["căn hộ", "chung cư", "apartment", "can ho", "chung cu"]):
            return "apartment"
        return None

    def _fields_sufficient(self, data: dict) -> bool:
        """Check if regex extraction got enough fields to skip LLM."""
        required_fields = ["price_vnd", "bedrooms"]
        has_count = sum(1 for f in required_fields if data.get(f) is not None)
        optional_count = sum(
            1 for f in ["area_sqm", "building_name", "furnished", "floor_number"]
            if data.get(f) is not None
        )
        return has_count >= 1 and (has_count + optional_count) >= 3

    def extract_with_llm(self, text: str) -> dict:
        """Use Claude Haiku to extract structured data from unstructured text."""
        if not self.anthropic_client:
            logger.warning("Anthropic API not configured, skipping LLM extraction")
            return {}

        try:
            response = self.anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system="Extract rental listing details from this text. Return ONLY valid JSON with these fields: bedrooms (int), bathrooms (int), area_sqm (float), floor_number (int), building_name (string), furnished (furnished/semi-furnished/unfurnished), price_vnd (int), price_usd (float), amenities (array of strings), address (string), contact_phone (string), contact_channel (string), lease_min_months (int), pets_allowed (bool), property_type (apartment/house/villa/studio/room). Use null for unknown fields.",
                messages=[{"role": "user", "content": text}],
            )

            raw = response.content[0].text.strip()
            # Try to parse JSON from the response
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(raw)
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return {}

    def extract(self, text: str, use_llm_fallback: bool = False) -> dict:
        """Full extraction pipeline: regex first, LLM fallback if insufficient.
        
        NOTE: LLM fallback disabled temporarily due to API limits (2026-02-20).
        """
        result = self.extract_all_regex(text)

        if not self._fields_sufficient(result) and use_llm_fallback:
            logger.debug("Regex extraction insufficient, falling back to LLM")
            llm_data = self.extract_with_llm(text)
            # Merge: regex results take priority over LLM
            for key, value in llm_data.items():
                if result.get(key) is None and value is not None:
                    result[key] = value

        return result
