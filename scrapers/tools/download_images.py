#!/usr/bin/env python3
"""Download Facebook CDN listing images to local storage before they expire.

Stores as WebP in public/listing-images/{listing_id}/{index}.webp
Updates listings table with local URLs.
"""

import os
import sys
import json
import asyncio
import aiohttp
import psycopg2
from pathlib import Path
from PIL import Image
from io import BytesIO

DB_URL = os.getenv("DATABASE_URL", "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang")
IMAGE_DIR = Path("/opt/visual-movement/rentdanang/apps/web/public/listing-images")
MAX_CONCURRENT = 10
WEBP_QUALITY = 80
MAX_WIDTH = 800

async def download_one(session, url, dest, sem):
    async with sem:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return False
                data = await resp.read()
            img = Image.open(BytesIO(data))
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            if img.width > MAX_WIDTH:
                ratio = MAX_WIDTH / img.width
                img = img.resize((MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)
            dest.parent.mkdir(parents=True, exist_ok=True)
            img.save(str(dest), 'WebP', quality=WEBP_QUALITY)
            return True
        except Exception as e:
            return False

async def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Get all listings with fbcdn images
    cur.execute("""
        SELECT id, images::text
        FROM listings
        WHERE is_active = true
          AND is_duplicate = false
          AND images IS NOT NULL
          AND jsonb_array_length(images) > 0
          AND (images->>0) LIKE '%%fbcdn.net%%'
        ORDER BY first_seen_at DESC
    """)
    rows = cur.fetchall()
    print(f"Found {len(rows)} listings with Facebook images")

    sem = asyncio.Semaphore(MAX_CONCURRENT)
    updated = 0
    skipped = 0
    failed_dl = 0

    async with aiohttp.ClientSession() as session:
        for listing_id, images_text in rows:
            lid = str(listing_id)
            images = json.loads(images_text)
            new_urls = []
            changed = False

            for i, url in enumerate(images):
                if not url or not isinstance(url, str):
                    new_urls.append(url)
                    continue
                
                # Already local
                if url.startswith('/listing-images/'):
                    new_urls.append(url)
                    continue

                # Only process fbcdn
                if 'fbcdn.net' not in url:
                    new_urls.append(url)
                    continue

                dest = IMAGE_DIR / lid / f"{i}.webp"
                if dest.exists():
                    new_urls.append(f"/listing-images/{lid}/{i}.webp")
                    changed = True
                    continue

                ok = await download_one(session, url, dest, sem)
                if ok:
                    new_urls.append(f"/listing-images/{lid}/{i}.webp")
                    changed = True
                else:
                    new_urls.append(url)  # keep original
                    failed_dl += 1

            if changed:
                cur.execute(
                    "UPDATE listings SET images = %s::jsonb WHERE id = %s",
                    [json.dumps(new_urls), listing_id]
                )
                conn.commit()
                updated += 1
            else:
                skipped += 1

            total = updated + skipped
            if total % 100 == 0 and total > 0:
                print(f"  Progress: {updated} updated, {skipped} skipped, {failed_dl} failed downloads")

    cur.close()
    conn.close()
    
    # Refresh the materialized view if it exists
    try:
        conn2 = psycopg2.connect(DB_URL)
        cur2 = conn2.cursor()
        cur2.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY v_properties")
        conn2.commit()
        cur2.close()
        conn2.close()
        print("Refreshed v_properties view")
    except Exception as e:
        print(f"View refresh skipped: {e}")

    print(f"\nDone: {updated} updated, {skipped} skipped, {failed_dl} failed downloads")
    size_mb = sum(f.stat().st_size for f in IMAGE_DIR.rglob('*.webp')) / 1024 / 1024
    print(f"Total image storage: {size_mb:.1f} MB")

if __name__ == "__main__":
    asyncio.run(main())
