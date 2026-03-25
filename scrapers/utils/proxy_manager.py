"""Proxy rotation manager for scraping."""

import random
from urllib.parse import urlparse

from loguru import logger

from config import Config


class ProxyManager:
    """Manages proxy rotation for scrapers."""

    def __init__(self):
        self._proxies: list[dict] = []
        self._current_index = 0
        self._load_proxies()

    @staticmethod
    def _parse_proxy_url(url: str) -> dict:
        """Parse a proxy URL into Playwright-compatible dict."""
        parsed = urlparse(url)
        result = {"server": f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"}
        if parsed.username:
            result["username"] = parsed.username
        if parsed.password:
            result["password"] = parsed.password
        return result

    def _load_proxies(self):
        """Load proxy configurations."""
        primary = Config.get_proxy_url()
        if primary:
            self._proxies.append(self._parse_proxy_url(primary))

        # Bright Data proxy with session rotation
        if Config.BRIGHT_DATA_TOKEN:
            for i in range(5):
                session_id = f"rentdanang_session_{i}"
                proxy_url = (
                    f"http://{Config.PROXY_USER}-session-{session_id}"
                    f":{Config.PROXY_PASS}@{Config.PROXY_HOST}:{Config.PROXY_PORT}"
                )
                self._proxies.append(self._parse_proxy_url(proxy_url))

        if self._proxies:
            logger.info(f"Loaded {len(self._proxies)} proxy configurations")
        else:
            logger.warning("No proxies configured — scraping without proxy")

    def get_proxy(self) -> str | None:
        """Get next proxy URL string using round-robin rotation."""
        info = self.get_proxy_dict()
        if not info:
            return None
        server = info["server"]
        if info.get("username"):
            parsed = urlparse(server)
            return f"{parsed.scheme}://{info['username']}:{info.get('password', '')}@{parsed.hostname}:{parsed.port}"
        return server

    def get_proxy_dict(self) -> dict | None:
        """Get next proxy as Playwright-compatible dict with server/username/password."""
        if not self._proxies:
            return None
        proxy = self._proxies[self._current_index % len(self._proxies)]
        self._current_index += 1
        return proxy

    def get_random_proxy(self) -> str | None:
        """Get a random proxy URL string."""
        if not self._proxies:
            return None
        info = random.choice(self._proxies)
        server = info["server"]
        if info.get("username"):
            parsed = urlparse(server)
            return f"{parsed.scheme}://{info['username']}:{info.get('password', '')}@{parsed.hostname}:{parsed.port}"
        return server

    def remove_proxy(self, proxy_url: str):
        """Remove a dead proxy from the pool."""
        self._proxies = [p for p in self._proxies if proxy_url not in p.get("server", "")]
        logger.warning(f"Removed proxy from pool. {len(self._proxies)} remaining.")

    @property
    def count(self) -> int:
        return len(self._proxies)
