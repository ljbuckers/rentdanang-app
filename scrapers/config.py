"""Configuration for the RentDaNang scraper system."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang",
    )
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Proxy
    PROXY_HOST = os.getenv("PROXY_HOST", "")
    PROXY_PORT = os.getenv("PROXY_PORT", "")
    PROXY_USER = os.getenv("PROXY_USER", "")
    PROXY_PASS = os.getenv("PROXY_PASS", "")
    BRIGHT_DATA_TOKEN = os.getenv("BRIGHT_DATA_TOKEN", "")

    # APIs
    GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "")
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

    # Cloudflare R2
    R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY", "")
    R2_SECRET_KEY = os.getenv("R2_SECRET_KEY", "")
    R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "rentdanang-images")
    R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")

    # Scraper settings
    MIN_DELAY = 2
    MAX_DELAY = 8
    MAX_RETRIES = 3
    REQUEST_TIMEOUT = 30000  # ms

    # Facebook settings
    FB_COOKIE_FILE = Path(__file__).parent / "data" / "fb_cookies" / "playwright_session.json"
    FB_MAX_SCROLLS = 25
    FB_SCROLL_DELAY = 1.5
    FB_GROUP_DELAY = 3
    FB_MAX_POSTS_PER_SESSION = 200
    FB_GROUPS_PER_SESSION = 6
    FB_USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    )

    # VND/USD conversion
    VND_USD_RATE = 25500

    @classmethod
    def get_proxy_url(cls) -> str | None:
        if cls.PROXY_HOST and cls.PROXY_PORT:
            if cls.PROXY_USER and cls.PROXY_PASS:
                return f"http://{cls.PROXY_USER}:{cls.PROXY_PASS}@{cls.PROXY_HOST}:{cls.PROXY_PORT}"
            return f"http://{cls.PROXY_HOST}:{cls.PROXY_PORT}"
        return None

    @classmethod
    def get_r2_endpoint(cls) -> str:
        return f"https://{cls.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
