"""Facebook Groups scraper — cookie-based session with scroll-and-collect.

Uses cookies saved by fb_manual_login.py (one-time visible browser login).
Scrapes rental posts from Da Nang Facebook groups by scrolling the feed
and extracting posts from Facebook's virtualized DOM.

Raises SessionExpiredError when cookies are no longer valid — the manager
should log a warning and NOT retry (cookies require manual refresh).
"""

import asyncio
import hashlib
import json
import re
from datetime import datetime, timezone

from loguru import logger
from playwright.async_api import async_playwright

from base_scraper import BaseScraper
from config import Config

# Verified groups the user has joined
FB_GROUPS = [
    {"name": "Apartments for rent in Da Nang", "url": "https://www.facebook.com/groups/366245597210651/"},
    {"name": "DA NANG EXPATS HOUSE-APT", "url": "https://www.facebook.com/groups/2050474701865103/"},
    {"name": "Apartment For Rent in Da Nang", "url": "https://www.facebook.com/groups/584133053598082/"},
    {"name": "Properties Sales/Lease Danang", "url": "https://www.facebook.com/groups/danangproperty4rent/"},
    {"name": "Expats in Da Nang City", "url": "https://www.facebook.com/groups/expatsindanangcity/"},
    {"name": "Apartments Houses Villas Rental Da Nang Hoi An", "url": "https://www.facebook.com/groups/203559903815711/"},
    {"name": "Housing Apartment for rent in DaNang", "url": "https://www.facebook.com/groups/2079750999021233/"},
]

RENTAL_KEYWORDS = [
    "cho thu", "for rent", "apartment", "can ho", "phong",
    "house", "villa", "studio", "bedroom", "phong ngu",
    "trieu", "/thang", "/month", "furnished", "noi that",
    "$", "usd", "sqm", "m2", "vnd", "price", "gia",
    "1br", "2br", "3br", "balcon",
]

# JS that extracts all visible posts from the current DOM snapshot.
# Facebook's DOM uses data-virtualized="false" as post containers (NOT role="article").
EXTRACT_POSTS_JS = r"""() => {
    const posts = [];
    const containers = document.querySelectorAll('div[data-virtualized="false"]');

    for (const container of containers) {
        try {
            // --- Text ---
            let text = '';
            container.querySelectorAll('div[dir="auto"], span[dir="auto"]').forEach(el => {
                const t = el.innerText ? el.innerText.trim() : '';
                if (t.length > 10) text += t + '\n';
            });
            if (text.length < 40) continue;

            // Skip non-post containers (sidebar widgets, "Invite friends", etc.)
            const textLower = text.toLowerCase();
            if (textLower.includes('invite friends') ||
                textLower.includes('suggested for you') ||
                textLower.includes('create a post')) continue;

            // --- Images ---
            const images = [];
            container.querySelectorAll('img').forEach(img => {
                const s = img.src || '';
                if ((s.includes('scontent') || s.includes('fbcdn')) &&
                    !s.includes('emoji') && !s.includes('36x36') &&
                    !s.includes('profile_pic') && !s.includes('cp0') &&
                    !s.includes('rsrc.php')) {
                    const w = parseInt(img.getAttribute('width') || '0', 10);
                    if (w === 0 || w > 1) images.push(s);
                }
            });

            // --- Author ---
            let author = null;
            const authorEl = container.querySelector('h2 a, h3 a, strong a');
            if (authorEl) author = authorEl.innerText;

            // --- Post URL ---
            let postUrl = null;
            container.querySelectorAll('a[href]').forEach(a => {
                if (postUrl) return;
                const h = a.href || '';
                if (h.includes('/posts/') || h.includes('/permalink/')) {
                    postUrl = h.split('?')[0];
                }
            });

            posts.push({
                raw_text: text.substring(0, 3000),
                poster_name: author,
                post_url: postUrl,
                images: images.slice(0, 15),
                image_count: images.length,
            });
        } catch(e) {}
    }

    return posts;
}"""


class SessionExpiredError(Exception):
    """Raised when Facebook session cookies are no longer valid."""


class FacebookScraper(BaseScraper):
    """Scrape rental listings from Facebook Groups using saved session cookies."""

    name = "facebook"
    source_platform = "facebook"

    def __init__(self):
        super().__init__(use_proxy=False)
        self._pw = None

    async def _launch_browser(self):
        """Launch browser with anti-detection and NO image blocking.

        We don't use BaseScraper.launch_browser() because it blocks images
        by default (route abort on *.png, *.jpg, etc.) — we need images.
        """
        self._pw = await async_playwright().start()
        self.browser = await self._pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="en-US",
            user_agent=Config.FB_USER_AGENT,
        )
        # Spoof webdriver detection
        await self.context.add_init_script(
            'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
        )

    def _load_cookies(self) -> list[dict]:
        """Load cookies from the saved session file."""
        cookie_file = Config.FB_COOKIE_FILE
        if not cookie_file.exists():
            raise SessionExpiredError(
                f"No cookie file at {cookie_file} — run fb_manual_login.py first"
            )
        raw = json.loads(cookie_file.read_text())
        # Handle both formats: plain array or {cookies: [...], origins: [...]}
        if isinstance(raw, dict):
            return raw.get("cookies", [])
        return raw

    def _save_cookies(self, cookies: list[dict]):
        """Save refreshed cookies back to file."""
        Config.FB_COOKIE_FILE.parent.mkdir(parents=True, exist_ok=True)
        Config.FB_COOKIE_FILE.write_text(
            json.dumps(cookies, indent=2), encoding="utf-8"
        )

    async def _validate_session(self, page):
        """Check if the session is still valid. Raise SessionExpiredError if not."""
        await page.goto(
            "https://www.facebook.com/",
            wait_until="domcontentloaded",
            timeout=15000,
        )
        await asyncio.sleep(3)
        login_form = await page.query_selector("#email")
        if login_form:
            raise SessionExpiredError(
                "Facebook session expired — run fb_manual_login.py to re-login"
            )

    @staticmethod
    def _is_rental_post(text: str) -> bool:
        """Check if text contains enough rental keywords (2+ matches)."""
        text_lower = text.lower()
        matches = sum(1 for kw in RENTAL_KEYWORDS if kw in text_lower)
        return matches >= 2

    @staticmethod
    def _extract_group_id(url: str) -> str:
        """Extract group ID or slug from URL for source_id construction."""
        # https://www.facebook.com/groups/366245597210651/ → 366245597210651
        # https://www.facebook.com/groups/danangproperty4rent/ → danangproperty4rent
        m = re.search(r"/groups/([^/?]+)", url)
        return m.group(1) if m else "unknown"

    async def _scrape_group(self, page, group: dict) -> list[dict]:
        """Scrape a single Facebook group by scrolling and collecting."""
        group_name = group["name"]
        group_url = group["url"]
        group_id = self._extract_group_id(group_url)
        logger.info(f"[facebook] Scraping: {group_name}")

        collected = {}  # keyed by first 100 chars for in-session dedup

        try:
            await page.goto(group_url, wait_until="domcontentloaded", timeout=25000)
            await asyncio.sleep(8)  # Wait for React to render initial feed

            title = await page.title()
            logger.debug(f"[facebook] Page title: {title[:60]}")

            for scroll_round in range(Config.FB_MAX_SCROLLS):
                # Extract visible posts from DOM
                visible = await page.evaluate(EXTRACT_POSTS_JS)

                for post in visible:
                    text = post.get("raw_text", "")
                    key = text[:100].strip()
                    if not key or key in collected:
                        continue
                    if not self._is_rental_post(text):
                        continue

                    # Build source_id: use text hash since FB feed
                    # no longer exposes /posts/ permalink URLs
                    text_hash = hashlib.md5(
                        text[:500].encode("utf-8", errors="ignore")
                    ).hexdigest()[:12]
                    source_id = f"fb_{group_id}_{text_hash}"

                    collected[key] = {
                        "raw_text": text,
                        "source_id": source_id,
                        "post_url": post.get("post_url"),
                        "poster_name": post.get("poster_name"),
                        "images": post.get("images", []),
                        "posted_at": None,
                        "source_platform": "facebook",
                        "group_name": group_name,
                        "group_url": group_url,
                        "scraped_at": datetime.now(timezone.utc).isoformat(),
                    }

                # Scroll down
                await page.evaluate("window.scrollBy(0, 400)")
                await asyncio.sleep(Config.FB_SCROLL_DELAY)

                if scroll_round % 5 == 4:
                    logger.info(
                        f"[facebook] {group_name} scroll {scroll_round + 1}: "
                        f"{len(visible)} articles visible, "
                        f"{len(collected)} rental posts collected"
                    )

                # Stop early if we've hit the session cap
                if len(collected) >= Config.FB_MAX_POSTS_PER_SESSION:
                    break

        except SessionExpiredError:
            raise
        except Exception as e:
            logger.error(f"[facebook] Error scraping {group_name}: {e}")

        logger.info(f"[facebook] {group_name}: {len(collected)} rental posts")
        return list(collected.values())

    async def scrape(self) -> list[dict]:
        """Scrape all configured Facebook groups."""
        # Launch browser and load cookies
        await self._launch_browser()
        cookies = self._load_cookies()
        await self.context.add_cookies(cookies)
        page = await self.context.new_page()

        # Validate session
        await self._validate_session(page)
        logger.info("[facebook] Session valid")

        # Scrape groups
        all_posts = []
        groups = FB_GROUPS[: Config.FB_GROUPS_PER_SESSION]

        for group in groups:
            posts = await self._scrape_group(page, group)
            all_posts.extend(posts)

            # Stop if we've hit the session cap
            if len(all_posts) >= Config.FB_MAX_POSTS_PER_SESSION:
                logger.info(
                    f"[facebook] Session cap reached ({len(all_posts)} posts)"
                )
                break

            await asyncio.sleep(Config.FB_GROUP_DELAY)

        logger.info(
            f"[facebook] Total: {len(all_posts)} rental posts "
            f"from {len(groups)} groups"
        )
        return all_posts

    async def cleanup(self):
        """Refresh cookies and close browser."""
        if self.context:
            try:
                fresh_cookies = await self.context.cookies()
                self._save_cookies(fresh_cookies)
                logger.debug("[facebook] Cookies refreshed")
            except Exception:
                pass
        # Let BaseScraper close browser/context
        await super().cleanup()
        # Close Playwright process
        if self._pw:
            await self._pw.stop()
            self._pw = None


if __name__ == "__main__":
    import sys

    # Standalone test: run scraper and print results
    async def _test():
        sys.stdout.reconfigure(encoding="utf-8")
        scraper = FacebookScraper()
        try:
            listings = await scraper.scrape()
            print(f"\n{'=' * 60}")
            print(f"TOTAL: {len(listings)} rental posts")
            print(f"{'=' * 60}")
            for i, post in enumerate(listings[:20]):
                txt = post["raw_text"][:160].replace("\n", " ")
                author = (post.get("poster_name") or "?")[:20]
                imgs = len(post.get("images", []))
                sid = post.get("source_id") or "no-id"
                print(f"\n[{i + 1}] {author:20s} | imgs:{imgs} | {sid}")
                print(f"    {txt}...")
        except SessionExpiredError as e:
            print(f"SESSION EXPIRED: {e}")
        finally:
            await scraper.cleanup()

    asyncio.run(_test())
