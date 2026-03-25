"""Vietnamese → English translation using Google Cloud Translation API."""

import hashlib
import json
import re

import redis
from google.cloud import translate_v2 as translate
from loguru import logger

from config import Config

# Simple language detection patterns
VIETNAMESE_CHARS = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", re.IGNORECASE)


class Translator:
    """Handles Vietnamese → English translation with caching."""

    def __init__(self):
        self.redis_client = redis.from_url(Config.REDIS_URL)
        self._client = None

    @property
    def client(self):
        if self._client is None and Config.GOOGLE_TRANSLATE_API_KEY:
            self._client = translate.Client(api_key=Config.GOOGLE_TRANSLATE_API_KEY)
        return self._client

    def detect_language(self, text: str) -> str:
        """Detect if text is Vietnamese or English using heuristics."""
        if not text:
            return "en"

        vn_matches = len(VIETNAMESE_CHARS.findall(text))
        # If >2% of characters are Vietnamese diacritics, it's Vietnamese
        if len(text) > 0 and vn_matches / len(text) > 0.02:
            return "vi"

        # Check for common Vietnamese words
        vn_keywords = ["cho thuê", "căn hộ", "phòng", "tầng", "triệu", "liên hệ", "nội thất"]
        text_lower = text.lower()
        if any(kw in text_lower for kw in vn_keywords):
            return "vi"

        return "en"

    def _cache_key(self, text: str) -> str:
        """Generate cache key for translation."""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"rentdanang:translate:{text_hash}"

    def translate_text(self, text: str, source_lang: str = "vi", target_lang: str = "en") -> str:
        """Translate a single text string with caching."""
        if not text or not text.strip():
            return text

        # Check cache
        cache_key = self._cache_key(text)
        cached = self.redis_client.get(cache_key)
        if cached:
            return cached.decode("utf-8")

        if not self.client:
            logger.warning("Google Translate API not configured, returning original text")
            return text

        try:
            result = self.client.translate(text, source_language=source_lang, target_language=target_lang)
            translated = result["translatedText"]

            # Cache for 30 days
            self.redis_client.setex(cache_key, 60 * 60 * 24 * 30, translated)
            return translated
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return text

    def translate_batch(self, texts: list[str], source_lang: str = "vi", target_lang: str = "en") -> list[str]:
        """Translate multiple texts in batch (more cost-effective)."""
        if not texts:
            return []

        results = []
        uncached_texts = []
        uncached_indices = []

        # Check cache for each text
        for i, text in enumerate(texts):
            if not text or not text.strip():
                results.append(text)
                continue

            cache_key = self._cache_key(text)
            cached = self.redis_client.get(cache_key)
            if cached:
                results.append(cached.decode("utf-8"))
            else:
                results.append(None)  # placeholder
                uncached_texts.append(text)
                uncached_indices.append(i)

        # Batch translate uncached texts
        if uncached_texts and self.client:
            try:
                batch_results = self.client.translate(
                    uncached_texts, source_language=source_lang, target_language=target_lang
                )
                for idx, result in zip(uncached_indices, batch_results):
                    translated = result["translatedText"]
                    results[idx] = translated
                    # Cache
                    cache_key = self._cache_key(texts[idx])
                    self.redis_client.setex(cache_key, 60 * 60 * 24 * 30, translated)
            except Exception as e:
                logger.error(f"Batch translation failed: {e}")
                # Fill in originals for failed translations
                for idx in uncached_indices:
                    if results[idx] is None:
                        results[idx] = texts[idx]

        # Fill any remaining None values with originals
        for i, r in enumerate(results):
            if r is None:
                results[i] = texts[i]

        return results
