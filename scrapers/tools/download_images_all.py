#!/usr/bin/env python3
"""Download ALL Facebook CDN listing images (including duplicates)."""

import os, json, asyncio, aiohttp, psycopg2
from pathlib import Path
from PIL import Image
from io import BytesIO

DB_URL = os.getenv("DATABASE_URL", "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang")
IMAGE_DIR = Path("/opt/visual-movement/rentdanang/apps/web/public/listing-images")
MAX_CONCURRENT = 15
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
        except:
            return False

async def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # ALL listings with fbcdn images (including duplicates)
    cur.execute("""
        SELECT id, images::text
        FROM listings
        WHERE is_active = true
          AND images IS NOT NULL
          AND jsonb_array_length(images) > 0
          AND (images->>0) LIKE '%%fbcdn.net%%'
        ORDER BY first_seen_at DESC
    """)
    rows = cur.fetchall()
    print(f"Found {len(rows)} total listings with Facebook images")

    sem = asyncio.Semaphore(MAX_CONCURRENT)
    updated = 0
    failed_dl = 0

    async with aiohttp.ClientSession() as session:
        for listing_id, images_text in rows:
            lid = str(listing_id)
            images = json.loads(images_text)
            new_urls = []
            changed = False

            for i, url in enumerate(images):
                if not url or not isinstance(url, str) or 'fbcdn.net' not in url:
                    new_urls.append(url)
                    continue
                if url.startswith('/listing-images/'):
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
                    new_urls.append(url)
                    failed_dl += 1

            if changed:
                cur.execute("UPDATE listings SET images = %s::jsonb WHERE id = %s",
                    [json.dumps(new_urls), listing_id])
                conn.commit()
                updated += 1

            total = updated
            if total % 200 == 0 and total > 0:
                print(f"  {updated} updated, {failed_dl} failed dl")

    cur.close()
    conn.close()
    
    size_mb = sum(f.stat().st_size for f in IMAGE_DIR.rglob('*.webp')) / 1024 / 1024
    print(f"\nDone: {updated} updated, {failed_dl} failed dl, {size_mb:.1f} MB stored")

if __name__ == "__main__":
    asyncio.run(main())
