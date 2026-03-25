"""Image processing: download, generate pHash, upload to Cloudflare R2."""

import hashlib
import io
import uuid

import boto3
import httpx
import imagehash
from PIL import Image
from loguru import logger

from config import Config


class ImageProcessor:
    """Download listing images, compute perceptual hashes, upload to R2."""

    def __init__(self):
        self._s3_client = None

    @property
    def s3_client(self):
        if self._s3_client is None and Config.R2_ACCESS_KEY:
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=Config.get_r2_endpoint(),
                aws_access_key_id=Config.R2_ACCESS_KEY,
                aws_secret_access_key=Config.R2_SECRET_KEY,
                region_name="auto",
            )
        return self._s3_client

    async def process_images(self, image_urls: list[str], listing_id: str = None) -> dict:
        """
        Download images, compute pHash for each, upload to R2.

        Returns:
            {
                "stored_urls": [...],
                "thumbnail_url": str,
                "phashes": [...],
            }
        """
        stored_urls = []
        phashes = []
        thumbnail_url = None

        for i, url in enumerate(image_urls[:20]):  # Max 20 images per listing
            try:
                result = await self._process_single(url, listing_id or str(uuid.uuid4()), i)
                if result:
                    stored_urls.append(result["url"])
                    phashes.append(result["phash"])
                    if i == 0:
                        thumbnail_url = result["thumbnail_url"]
            except Exception as e:
                logger.error(f"Failed to process image {url}: {e}")

        return {
            "stored_urls": stored_urls,
            "thumbnail_url": thumbnail_url,
            "phashes": phashes,
        }

    async def _process_single(self, url: str, listing_id: str, index: int) -> dict | None:
        """Download, hash, and upload a single image."""
        # Download
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code != 200:
                logger.warning(f"Failed to download image: {url} (status {response.status_code})")
                return None

        image_data = response.content
        content_type = response.headers.get("content-type", "image/jpeg")

        # Compute pHash
        try:
            img = Image.open(io.BytesIO(image_data))
            phash = str(imagehash.phash(img))
        except Exception as e:
            logger.warning(f"Failed to compute pHash for {url}: {e}")
            phash = None

        # Generate thumbnail (400px wide)
        thumbnail_data = None
        try:
            img = Image.open(io.BytesIO(image_data))
            img.thumbnail((400, 400), Image.Resampling.LANCZOS)
            thumb_buffer = io.BytesIO()
            img.save(thumb_buffer, format="JPEG", quality=80)
            thumbnail_data = thumb_buffer.getvalue()
        except Exception:
            pass

        # Upload to R2
        ext = "jpg" if "jpeg" in content_type or "jpg" in content_type else "png"
        file_hash = hashlib.md5(image_data).hexdigest()[:8]
        key = f"listings/{listing_id}/{index}_{file_hash}.{ext}"
        thumb_key = f"listings/{listing_id}/thumb_{index}_{file_hash}.jpg"

        full_url = None
        thumb_url = None

        if self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=Config.R2_BUCKET_NAME,
                    Key=key,
                    Body=image_data,
                    ContentType=content_type,
                )
                full_url = f"{Config.R2_PUBLIC_URL}/{key}" if Config.R2_PUBLIC_URL else key

                if thumbnail_data:
                    self.s3_client.put_object(
                        Bucket=Config.R2_BUCKET_NAME,
                        Key=thumb_key,
                        Body=thumbnail_data,
                        ContentType="image/jpeg",
                    )
                    thumb_url = f"{Config.R2_PUBLIC_URL}/{thumb_key}" if Config.R2_PUBLIC_URL else thumb_key
            except Exception as e:
                logger.error(f"R2 upload failed: {e}")
                full_url = url  # fallback to original URL
        else:
            full_url = url  # No R2 configured, use original URL
            thumb_url = url

        return {
            "url": full_url,
            "thumbnail_url": thumb_url or full_url,
            "phash": phash,
        }
