import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("rentdanang-api")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start) * 1000

        key_id = getattr(request.state, "api_key_id", None)
        tier = getattr(request.state, "api_key_tier", None)

        logger.info(
            "%s %s %d %.0fms key=%s tier=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            key_id,
            tier,
        )

        return response
