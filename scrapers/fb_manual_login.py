"""Manual Facebook login — auto-detects when you've logged in.

Use this to generate the cookie file required for the headless scraper.
MUST BE RUN ON A MACHINE WITH A DISPLAY (e.g., your local computer),
then upload the generated 'data/fb_cookies/playwright_session.json' to the VPS.

Usage:
    python fb_manual_login.py
"""

import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE = Path(__file__).parent / "data" / "fb_cookies" / "playwright_session.json"
TIMEOUT_SECONDS = 300  # 5 minutes


def main():
    print("Opening Facebook in a browser window...")
    print("Log in normally — cookies will be saved automatically once detected.\n")
    print(f"Timeout: {TIMEOUT_SECONDS // 60} minutes\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,  # Visible browser required for manual login
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        )
        context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        page = context.new_page()
        page.goto("https://www.facebook.com/", wait_until="domcontentloaded")

        print("Waiting for login... (polling every 3 seconds)")
        start = time.time()
        saved = False

        while time.time() - start < TIMEOUT_SECONDS:
            cookies = context.cookies()
            cookie_names = [c["name"] for c in cookies]

            if "c_user" in cookie_names:
                # Wait a moment for all cookies to settle
                time.sleep(2)
                cookies = context.cookies()

                COOKIE_FILE.parent.mkdir(parents=True, exist_ok=True)
                COOKIE_FILE.write_text(json.dumps(cookies, indent=2))
                user_id = next(c["value"] for c in cookies if c["name"] == "c_user")
                print(f"\n[+] Login detected! User ID: {user_id}")
                print(f"[+] Saved {len(cookies)} cookies to {COOKIE_FILE}")
                print("[+] You can close the browser now.")
                saved = True
                # Keep browser open for 10 seconds so user sees the success
                time.sleep(10)
                break

            time.sleep(3)

        if not saved:
            print("\n[-] Timed out — no login detected within 5 minutes.")
            print("[-] Try again.")

        browser.close()


if __name__ == "__main__":
    main()
