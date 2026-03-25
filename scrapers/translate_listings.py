"""
Translate Vietnamese listing titles and descriptions to English.

Uses the free Google Translate web endpoint (gtx client) to translate
all listings that have NULL title_en or description_en values.
"""

import json
import time
import urllib.parse

import httpx
import psycopg2
from loguru import logger

DB_DSN = os.getenv("DATABASE_URL", "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang")

TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
RATE_LIMIT_DELAY = 0.5  # seconds between requests


def translate_text(client: httpx.Client, text: str):
    """Translate Vietnamese text to English using Google Translate gtx endpoint.

    Returns the translated string, or None on failure.
    """
    if not text or not text.strip():
        return None

    params = {
        "client": "gtx",
        "sl": "vi",
        "tl": "en",
        "dt": "t",
        "q": text,
    }

    try:
        resp = client.get(TRANSLATE_URL, params=params, timeout=15.0)
        resp.raise_for_status()
        data = resp.json()

        # Response structure: [[["translated segment", "source segment", ...], ...], ...]
        # Concatenate all translated segments from the first top-level element.
        segments = data[0]
        translated = "".join(seg[0] for seg in segments if seg and seg[0])
        return translated.strip() if translated.strip() else None

    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        logger.warning(f"HTTP error translating text (first 60 chars: {text[:60]!r}): {exc}")
        return None
    except (json.JSONDecodeError, IndexError, TypeError, KeyError) as exc:
        logger.warning(f"Parse error for translation response: {exc}")
        return None


def main():
    logger.info("Connecting to database...")
    conn = psycopg2.connect(DB_DSN)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            # Fetch all listings that need translation
            cur.execute(
                """
                SELECT id, title, description
                FROM listings
                WHERE title_en IS NULL OR description_en IS NULL
                ORDER BY id
                """
            )
            rows = cur.fetchall()

        total = len(rows)
        logger.info(f"Found {total} listings needing translation.")

        if total == 0:
            logger.info("Nothing to do.")
            return

        success_count = 0
        skip_count = 0

        with httpx.Client(
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            follow_redirects=True,
        ) as client:
            for idx, (listing_id, title, description) in enumerate(rows, start=1):
                logger.info(f"[{idx}/{total}] Translating listing id={listing_id}...")

                # --- Translate title ---
                title_en = None
                if title:
                    title_en = translate_text(client, title)
                    time.sleep(RATE_LIMIT_DELAY)

                # --- Translate description ---
                desc_en = None
                if description:
                    desc_en = translate_text(client, description)
                    time.sleep(RATE_LIMIT_DELAY)

                if title_en is None and desc_en is None:
                    logger.warning(
                        f"  Skipped listing id={listing_id}: both translations failed."
                    )
                    skip_count += 1
                    continue

                # --- Update DB ---
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            UPDATE listings
                            SET title_en = COALESCE(%s, title_en),
                                description_en = COALESCE(%s, description_en)
                            WHERE id = %s
                            """,
                            (title_en, desc_en, listing_id),
                        )
                    conn.commit()
                    success_count += 1

                    preview_title = (title_en[:70] + "...") if title_en and len(title_en) > 70 else title_en
                    logger.info(f"  OK  title_en={preview_title!r}")

                except psycopg2.Error as exc:
                    conn.rollback()
                    logger.error(f"  DB error for listing id={listing_id}: {exc}")
                    skip_count += 1

        logger.info("=" * 60)
        logger.info(f"Done. {success_count}/{total} listings translated successfully.")
        if skip_count:
            logger.info(f"Skipped: {skip_count}")
        logger.info("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
