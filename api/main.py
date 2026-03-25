import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from middleware.auth import APIKeyMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.logging import RequestLoggingMiddleware
from routers import listings, market, neighborhoods, trends, spatial

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

app = FastAPI(
    title="RentDaNang API",
    description=(
        "Structured rental data for Da Nang, Vietnam. "
        "The only API providing SE Asian rental market data."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware order matters: logging wraps rate_limit wraps auth
# (outermost added last, innermost added first)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(APIKeyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(listings.router)
app.include_router(market.router)
app.include_router(neighborhoods.router)
app.include_router(trends.router)
app.include_router(spatial.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
