from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from config import TIERS

EXEMPT_PATHS = {"/docs", "/redoc", "/openapi.json", "/health"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        tier = getattr(request.state, "api_key_tier", None)
        calls_today = getattr(request.state, "api_key_calls_today", None)

        if tier is None:
            return await call_next(request)

        limit = TIERS.get(tier, TIERS["free"])["calls_per_day"]

        if calls_today is not None and calls_today >= limit:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. {tier} tier allows {limit} calls/day. "
                    f"Upgrade at https://rentdanang.app/pricing"
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, limit - (calls_today or 0) - 1)
        )
        return response
