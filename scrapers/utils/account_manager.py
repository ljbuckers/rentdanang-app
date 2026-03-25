"""Facebook account manager for rotation and warming."""

import json
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

import redis
from loguru import logger

from config import Config

ACCOUNTS_DIR = Path(__file__).parent.parent / "data" / "fb_accounts"
COOKIES_DIR = Path(__file__).parent.parent / "data" / "fb_cookies"


class FacebookAccount:
    """Represents a Facebook account for scraping."""

    def __init__(self, account_id: str, email: str, password: str, name: str = ""):
        self.account_id = account_id
        self.email = email
        self.password = password
        self.name = name
        self.cookie_file = COOKIES_DIR / f"{account_id}.json"
        self.last_used: datetime | None = None
        self.is_warming = False
        self.is_banned = False
        self.cooldown_until: datetime | None = None

    def is_available(self) -> bool:
        """Check if account is available for scraping."""
        if self.is_banned:
            return False
        if self.cooldown_until and datetime.now(timezone.utc) < self.cooldown_until:
            return False
        return True

    def load_cookies(self) -> list[dict] | None:
        """Load saved cookies for this account."""
        if self.cookie_file.exists():
            return json.loads(self.cookie_file.read_text())
        return None

    def save_cookies(self, cookies: list[dict]):
        """Save cookies after login."""
        self.cookie_file.parent.mkdir(parents=True, exist_ok=True)
        self.cookie_file.write_text(json.dumps(cookies, indent=2))

    def set_cooldown(self, hours: int = None):
        """Put account on cooldown."""
        h = hours or Config.FB_COOLDOWN_HOURS
        self.cooldown_until = datetime.now(timezone.utc) + timedelta(hours=h)
        logger.warning(f"Account {self.account_id} on cooldown until {self.cooldown_until}")


class AccountManager:
    """Manages Facebook account rotation for scraping."""

    def __init__(self):
        self.accounts: list[FacebookAccount] = []
        self.redis_client = redis.from_url(Config.REDIS_URL)
        self._load_accounts()

    def _load_accounts(self):
        """Load accounts from the data directory."""
        ACCOUNTS_DIR.mkdir(parents=True, exist_ok=True)
        COOKIES_DIR.mkdir(parents=True, exist_ok=True)

        accounts_file = ACCOUNTS_DIR / "accounts.json"
        if not accounts_file.exists():
            logger.info("No Facebook accounts configured. Creating template file.")
            template = [
                {
                    "account_id": "fb_001",
                    "email": "example@email.com",
                    "password": "password_here",
                    "name": "Nguyen Van A",
                }
            ]
            accounts_file.write_text(json.dumps(template, indent=2))
            return

        data = json.loads(accounts_file.read_text())
        for entry in data:
            account = FacebookAccount(
                account_id=entry["account_id"],
                email=entry["email"],
                password=entry["password"],
                name=entry.get("name", ""),
            )
            self.accounts.append(account)

        logger.info(f"Loaded {len(self.accounts)} Facebook accounts")

    def get_available_account(self) -> FacebookAccount | None:
        """Get the next available account for scraping (round-robin with cooldown check)."""
        available = [a for a in self.accounts if a.is_available()]
        if not available:
            logger.warning("No Facebook accounts available for scraping")
            return None

        # Pick the least-recently-used account
        available.sort(key=lambda a: a.last_used or datetime.min.replace(tzinfo=timezone.utc))
        account = available[0]
        account.last_used = datetime.now(timezone.utc)

        # Track usage in Redis
        self.redis_client.hset(
            f"rentdanang:fb_accounts:{account.account_id}",
            "last_used",
            account.last_used.isoformat(),
        )

        return account

    def report_challenge(self, account: FacebookAccount):
        """Report that an account received a security challenge."""
        account.set_cooldown()
        self.redis_client.hset(
            f"rentdanang:fb_accounts:{account.account_id}",
            mapping={
                "cooldown_until": account.cooldown_until.isoformat(),
                "status": "cooldown",
            },
        )

    def report_ban(self, account: FacebookAccount):
        """Report that an account was banned."""
        account.is_banned = True
        self.redis_client.hset(
            f"rentdanang:fb_accounts:{account.account_id}",
            "status",
            "banned",
        )
        logger.error(f"Account {account.account_id} has been banned!")

    @property
    def available_count(self) -> int:
        return sum(1 for a in self.accounts if a.is_available())
