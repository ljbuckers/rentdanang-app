import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://rentdanang:rentdanang_dev@localhost:5432/rentdanang",
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

TIERS = {
    "free": {"calls_per_day": 100, "price": 0},
    "basic": {"calls_per_day": 1000, "price_monthly": 19},
    "pro": {"calls_per_day": 5000, "price_monthly": 49},
    "enterprise": {"calls_per_day": 50000, "price_monthly": 199},
}
