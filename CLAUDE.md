RentDaNang is a rental property aggregator for Da Nang, Vietnam. It scrapes listings from multiple Vietnamese platforms, normalizes them into a canonical format, and serves them through a Next.js frontend with map-based search and multi-language support.

Stack: Next.js 14 (App Router), TypeScript, Tailwind, pnpm monorepo. Python scrapers with FastAPI backend. PostgreSQL with PostGIS for spatial queries. Redis for caching.

Getting started: pnpm install at the root, pnpm dev to run the web app. Backend: cd api && pip install -r requirements.txt && uvicorn main:app. Scraper deps: cd scrapers && pip install -r requirements.txt.

Build: pnpm build
Lint: pnpm lint (runs next lint across packages)
Format: pnpm format (prettier)
Test frontend: pnpm test (vitest, runs from apps/web)
Test scrapers: cd scrapers && pytest

Monorepo layout:
  apps/web/        Next.js frontend (pages, components, lib/, API routes)
  api/             FastAPI backend (listings endpoint, health check)
  scrapers/        Python scrapers (one per source) + processing pipeline
  shared/          TypeScript types and constants shared across packages
  database/        SQL migrations and seed scripts

Six locales: en, vi, ko, zh, ja, ru. Eight currencies: VND, USD, GBP, EUR, KRW, CNY, JPY, RUB. Touching one locale means updating all six. Locale files are in apps/web/messages/.

Five scrapers with five different data shapes. Normalization is per-scraper, not centralized. They all converge in scrapers/processing/canonical_builder.py which produces the unified listing format.

The map uses dynamic import because Leaflet needs window and breaks SSR. Do not import map components at the top level.

Spatial queries use PostGIS. District boundaries are GeoJSON in shared/constants.

Strict TypeScript, no any. Tailwind only, no CSS modules. Do not add dependencies without asking. Do not modify scraper schedules or PM2 config.

Pre-commit hooks run eslint --fix and prettier --write via husky + lint-staged. Do not bypass with --no-verify.
