"""Anti-detection utilities for stealth scraping."""

import random

# Common screen resolutions
VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1366, "height": 768},
    {"width": 1536, "height": 864},
    {"width": 1440, "height": 900},
    {"width": 1280, "height": 720},
    {"width": 1600, "height": 900},
]


def get_stealth_args() -> list[str]:
    """Return Chromium launch args for stealth mode."""
    return [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-infobars",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        f"--window-size={random.choice(VIEWPORTS)['width']},{random.choice(VIEWPORTS)['height']}",
    ]


def get_random_viewport() -> dict:
    """Return a random viewport size."""
    return random.choice(VIEWPORTS)


def get_random_user_agent() -> str:
    """Return a random modern Chrome user agent."""
    versions = [
        "120.0.6099.109",
        "121.0.6167.85",
        "122.0.6261.94",
        "123.0.6312.58",
        "124.0.6367.91",
    ]
    platforms = [
        "Windows NT 10.0; Win64; x64",
        "Macintosh; Intel Mac OS X 10_15_7",
        "X11; Linux x86_64",
    ]
    version = random.choice(versions)
    platform = random.choice(platforms)
    return f"Mozilla/5.0 ({platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36"
