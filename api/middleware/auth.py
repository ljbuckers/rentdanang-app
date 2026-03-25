import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from database import get_cursor


EXEMPT_PATHS = {"/docs", "/redoc", "/openapi.json", "/health"}


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing X-API-Key header"},
            )

        with get_cursor() as cur:
            cur.execute(
                "SELECT id, tier, active, calls_today FROM api_keys WHERE key = %s",
                (api_key,),
            )
            row = cur.fetchone()

        if not row:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid API key"},
            )

        if not row["active"]:
            return JSONResponse(
                status_code=403,
                content={"detail": "API key is deactivated"},
            )

        request.state.api_key_id = row["id"]
        request.state.api_key_tier = row["tier"]
        request.state.api_key_calls_today = row["calls_today"]

        response = await call_next(request)

        # Update usage counters after successful response
        with get_cursor() as cur:
            cur.execute(
                "UPDATE api_keys SET calls_today = calls_today + 1, "
                "calls_total = calls_total + 1, last_used = NOW() WHERE id = %s",
                (row["id"],),
            )

        return response
