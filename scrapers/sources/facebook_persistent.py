"""Facebook Groups scraper — connects to persistent Chrome via CDP.

Instead of launching a new browser and loading cookies, this scraper
connects to the always-running Chrome instance (started by start-vnc.sh)
that has an active Facebook session from a real login.

The browser runs on DISPLAY :99 with --remote-debugging-port=9222.
Playwright connects via CDP and opens new tabs for scraping, then closes them.

Anti-detection: human-like scrolling, mouse movement, reading pauses,
randomized timing, and staggered group access.
"""

import asyncio
import hashlib
import json
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger
from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import Config
from base_scraper import BaseScraper

# Groups to scrape — expand this list as you join more groups
FB_GROUPS = [
    # English groups
    # {"name": "Apartments for rent in Da Nang", "url": "https://www.facebook.com/groups/366245597210651/"},  # disabled 2026-03-12: "content not available"
    {"name": "DA NANG EXPATS HOUSE-APT", "url": "https://www.facebook.com/groups/2050474701865103/"},
    {"name": "Apartment For Rent in Da Nang", "url": "https://www.facebook.com/groups/584133053598082/"},
    {"name": "Properties Sales/Lease Danang", "url": "https://www.facebook.com/groups/danangproperty4rent/"},
    # Vietnamese groups (add as you join them)
    # {"name": "Cho Thuê Phòng Trọ Đà Nẵng", "url": "https://www.facebook.com/groups/..."},
    # Korean groups
    # {"name": "다낭 부동산", "url": "https://www.facebook.com/groups/..."},
    # Russian groups
    # {"name": "Аренда в Дананге", "url": "https://www.facebook.com/groups/..."},
]

RENTAL_KEYWORDS = [
    # English
    "for rent", "apartment", "house", "villa", "studio", "bedroom",
    "furnished", "1br", "2br", "3br", "balcon", "/month", "sqm", "m2",
    # Vietnamese
    "cho thu", "can ho", "phong", "phong ngu", "noi that", "trieu", "/thang",
    # Korean
    "임대", "아파트", "방", "월세", "보증금", "원룸",
    # Russian
    "аренда", "квартира", "комната", "месяц", "депозит",
    # Chinese
    "出租", "公寓", "房间", "月租",
    # Japanese
    "賃貸", "アパート", "部屋", "家賃",
    # Universal
    "$", "usd", "vnd", "price", "gia",
]

# JS to extract posts from Facebook's virtualized DOM
EXTRACT_POSTS_JS = r"""() => {
    const posts = [];
    const feed = document.querySelector('[role="feed"]');
    if (!feed) return posts;
    const containers = feed.children;

    for (const container of containers) {
        try {
            let text = '';
            container.querySelectorAll('div[dir="auto"], span[dir="auto"]').forEach(el => {
                const t = el.innerText ? el.innerText.trim() : '';
                if (t.length > 10) text += t + '\n';
            });
            if (text.length < 40) continue;

            const textLower = text.toLowerCase();
            if (textLower.includes('invite friends') ||
                textLower.includes('suggested for you') ||
                textLower.includes('create a post')) continue;

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

            let author = null;
            const authorEl = container.querySelector('h2 a, h3 a, strong a');
            if (authorEl) author = authorEl.innerText;

            let postUrl = null;
            container.querySelectorAll('a[href]').forEach(a => {
                if (postUrl) return;
                const h = a.href || '';
                if (h.includes('/posts/') || h.includes('/permalink/')) {
                    postUrl = h.split('?')[0];
                }
            });

            // Get bounding rect for mouse targeting
            const rect = container.getBoundingClientRect();

            posts.push({
                raw_text: text.substring(0, 3000),
                poster_name: author,
                post_url: postUrl,
                images: images.slice(0, 15),
                image_count: images.length,
                y_position: rect.top + rect.height / 2,
                x_position: rect.left + rect.width / 2,
            });
        } catch(e) {}
    }
    return posts;
}"""

# JS to move mouse naturally (bezier-ish path)
MOUSE_MOVE_JS = """(target) => {
    const event = new MouseEvent('mousemove', {
        bubbles: true, cancelable: true,
        clientX: target.x + (Math.random() * 40 - 20),
        clientY: target.y + (Math.random() * 30 - 15),
    });
    document.elementFromPoint(target.x, target.y)?.dispatchEvent(event);
}"""


CDP_URL = "http://localhost:9222"


class SessionExpiredError(Exception):
    """Raised when Facebook session is no longer valid."""


class FacebookPersistentScraper(BaseScraper):
    """Scrape Facebook groups via the persistent Chrome browser.
    
    Anti-detection features:
    - Random scroll distances (250-800px, weighted toward medium)
    - Variable delays between scrolls (1.2-4.5s)
    - Reading pauses: 15% chance of a 3-8s pause (simulating reading a post)
    - Long pauses: 5% chance of a 10-20s pause (simulating distraction)
    - Mouse movement toward visible posts before scrolling
    - Randomized group order each run
    - Staggered delays between groups (15-45s)
    - Only scrape 2-4 groups per session (randomly chosen from the list)
    - Occasional small scroll-up (humans don't scroll perfectly down)
    """

    name = "facebook"
    source_platform = "facebook"

    def __init__(self):
        super().__init__(use_proxy=False)
        self._pw = None
        self._cdp_browser = None

    async def _connect(self):
        """Connect to the running Chrome instance via CDP."""
        self._pw = await async_playwright().start()
        self._cdp_browser = await self._pw.chromium.connect_over_cdp(CDP_URL)
        logger.info(f"[facebook] Connected to persistent Chrome ({len(self._cdp_browser.contexts)} contexts)")

    async def _check_session(self, page) -> bool:
        """Check if the Facebook session is still valid."""
        await page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=15000)
        await asyncio.sleep(random.uniform(2.5, 4.5))
        login_form = await page.query_selector("#email")
        if login_form:
            logger.error("[facebook] Session expired! User must re-login via VNC.")
            return False
        return True

    @staticmethod
    def _is_rental_post(text: str) -> bool:
        text_lower = text.lower()
        matches = sum(1 for kw in RENTAL_KEYWORDS if kw in text_lower)
        return matches >= 2

    @staticmethod
    def _extract_group_id(url: str) -> str:
        m = re.search(r"/groups/([^/?]+)", url)
        return m.group(1) if m else "unknown"

    async def _human_scroll(self, page):
        """Scroll like a human: variable distance, occasional scroll-up, mouse movement."""
        # 8% chance of a small scroll UP (humans overshoot and correct)
        if random.random() < 0.08:
            up_amount = random.randint(50, 180)
            await page.evaluate(f"window.scrollBy(0, -{up_amount})")
            await asyncio.sleep(random.uniform(0.3, 0.8))

        # Main scroll: weighted toward medium distances
        # Humans tend to scroll ~1 viewport height, with variation
        scroll_amount = random.choice([
            random.randint(250, 400),   # short scroll (30%)
            random.randint(400, 600),   # medium scroll (40%)
            random.randint(600, 800),   # long scroll (30%)
        ])
        
        # Smooth scroll via multiple small steps (more human-like)
        steps = random.randint(3, 6)
        per_step = scroll_amount / steps
        for i in range(steps):
            jitter = random.uniform(0.8, 1.2)
            await page.evaluate(f"window.scrollBy(0, {per_step * jitter})")
            await asyncio.sleep(random.uniform(0.05, 0.15))

    async def _human_delay(self):
        """Wait like a human between scrolls."""
        # Base delay: 1.2 to 3.5 seconds
        delay = random.uniform(1.2, 3.5)

        # 15% chance: reading a post (3-8 seconds)
        if random.random() < 0.15:
            delay = random.uniform(3.0, 8.0)
            logger.debug("[facebook] Simulating reading pause")

        # 5% chance: distraction / looking away (10-20 seconds)
        if random.random() < 0.05:
            delay = random.uniform(10.0, 20.0)
            logger.debug("[facebook] Simulating distraction pause")

        await asyncio.sleep(delay)

    async def _move_mouse_to_post(self, page, post: dict):
        """Move mouse toward a visible post (humans look at what they read)."""
        try:
            x = post.get("x_position", 640)
            y = post.get("y_position", 400)
            # Add human imprecision
            target_x = x + random.randint(-100, 100)
            target_y = y + random.randint(-50, 50)
            # Clamp to viewport
            target_x = max(100, min(target_x, 1180))
            target_y = max(100, min(target_y, 800))
            await page.mouse.move(target_x, target_y, steps=random.randint(5, 15))
        except Exception:
            pass  # Mouse movement is optional, never fail on it

    async def _scrape_group(self, page, group: dict) -> list[dict]:
        """Scrape a single group with human-like behavior."""
        group_name = group["name"]
        group_url = group["url"]
        group_id = self._extract_group_id(group_url)
        logger.info(f"[facebook] Scraping: {group_name}")

        collected = {}

        try:
            await page.goto(group_url, wait_until="domcontentloaded", timeout=25000)
            # Initial page load: humans take a moment to orient
            await asyncio.sleep(random.uniform(5.0, 10.0))

            # Move mouse to center of page (human reflex after page loads)
            await page.mouse.move(
                random.randint(400, 800),
                random.randint(300, 500),
                steps=random.randint(8, 20)
            )

            for scroll_round in range(Config.FB_MAX_SCROLLS):
                visible = await page.evaluate(EXTRACT_POSTS_JS)

                for post in visible:
                    text = post.get("raw_text", "")
                    key = text[:100].strip()
                    if not key or key in collected:
                        continue
                    if not self._is_rental_post(text):
                        continue

                    # Occasionally move mouse to a post we're "reading"
                    if random.random() < 0.3:
                        await self._move_mouse_to_post(page, post)

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

                # Human-like scroll
                await self._human_scroll(page)
                # Human-like delay
                await self._human_delay()

                if scroll_round % 5 == 4:
                    logger.info(
                        f"[facebook] {group_name} scroll {scroll_round + 1}: "
                        f"{len(visible)} visible, {len(collected)} collected"
                    )

                if len(collected) >= Config.FB_MAX_POSTS_PER_SESSION:
                    break

        except Exception as e:
            logger.error(f"[facebook] Error scraping {group_name}: {e}")

        logger.info(f"[facebook] {group_name}: {len(collected)} rental posts")
        return list(collected.values())

    async def scrape(self) -> list[dict]:
        """Connect to persistent browser, scrape groups with human-like patterns.
        
        Anti-detection strategy:
        - Shuffle group order each run
        - Pick 2-4 groups randomly (not always all of them)
        - Stagger 15-45s between groups
        """
        await self._connect()

        # Use default context (the one with the logged-in session)
        context = self._cdp_browser.contexts[0]

        # Check session validity
        check_page = await context.new_page()
        valid = await self._check_session(check_page)
        await check_page.close()

        if not valid:
            raise SessionExpiredError("Facebook session expired. Re-login required via VNC.")

        # Randomize: shuffle order, pick a subset
        groups = list(FB_GROUPS)
        random.shuffle(groups)
        # Pick 2-4 groups (or all if list is small), weighted toward more
        max_groups = min(len(groups), Config.FB_GROUPS_PER_SESSION)
        num_groups = random.choices(
            range(2, max_groups + 1),
            weights=[1] * (max_groups - 1),  # uniform distribution from 2 to max
            k=1
        )[0] if max_groups > 2 else max_groups
        groups = groups[:num_groups]

        logger.info(f"[facebook] This session: {num_groups} groups (of {len(FB_GROUPS)})")

        all_posts = []

        for i, group in enumerate(groups):
            page = await context.new_page()
            try:
                posts = await self._scrape_group(page, group)
                all_posts.extend(posts)
            finally:
                await page.close()

            if len(all_posts) >= Config.FB_MAX_POSTS_PER_SESSION:
                logger.info(f"[facebook] Session cap reached ({len(all_posts)} posts)")
                break

            # Stagger between groups: 15-45 seconds (humans don't instantly switch)
            if i < len(groups) - 1:
                between_delay = random.uniform(15.0, 45.0)
                logger.debug(f"[facebook] Waiting {between_delay:.0f}s before next group")
                await asyncio.sleep(between_delay)

        logger.info(f"[facebook] Total: {len(all_posts)} posts from {num_groups} groups")
        return all_posts

    async def cleanup(self):
        """Disconnect from browser (don't close it, it's persistent)."""
        if self._cdp_browser:
            self._cdp_browser = None
        if self._pw:
            await self._pw.stop()
            self._pw = None


if __name__ == "__main__":
    async def _test():
        sys.stdout.reconfigure(encoding="utf-8")
        scraper = FacebookPersistentScraper()
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
        except Exception as e:
            print(f"ERROR: {e}")
        finally:
            await scraper.cleanup()

    asyncio.run(_test())
