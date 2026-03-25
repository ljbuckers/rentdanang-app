Rental aggregator for Da Nang, Vietnam. Scrapes 5 sources, normalizes listings, serves them on a map. pnpm monorepo.

Stack: Next.js 14 App Router, TypeScript, Tailwind. Python scrapers with FastAPI backend on port 8000. PostgreSQL 16 with PostGIS, Redis for caching.

apps/web/           Next.js frontend, port 3000
apps/web/app/       routes
apps/web/lib/       utils, blog engine, i18n config, db
apps/web/components/ React components
apps/web/__tests__/ vitest tests
api/                FastAPI backend
scrapers/           Python scrapers, one per source
scrapers/processing/ normalization pipeline, canonical_builder.py is where all sources converge
shared/             TypeScript types and constants
database/           SQL migrations

pnpm install at root. pnpm dev runs the web app. pnpm build for production. pnpm lint runs next lint. pnpm test runs vitest from apps/web. pnpm format runs prettier.

Backend: cd api && pip install -r requirements.txt && uvicorn main:app
Scrapers: cd scrapers && pip install -r requirements.txt

Strict TypeScript, no any. Tailwind only, no CSS modules.

6 locales (en/vi/ko/zh/ja/ru) in apps/web/messages/. 8 currencies (VND/USD/GBP/EUR/KRW/CNY/JPY/RUB). If you touch one locale you must update all six.

5 scrapers with 5 different data shapes. Normalization happens per-scraper, not centralized. They all feed into scrapers/processing/canonical_builder.py.

The map uses dynamic import because Leaflet needs window and breaks SSR. Do not import map components at top level.

Spatial queries use PostGIS ST_DWithin, not ST_Distance. District boundaries are GeoJSON in shared/constants.

Currency exchange rates are cached in Redis, not fetched live. Blog posts are .ts files in apps/web/lib/blog/posts/, statically built at compile time.

Do not add dependencies without asking. Do not modify scraper schedules or PM2 config. No schema changes without a migration file in database/migrations/.

Pre-commit hooks run eslint --fix and prettier --write via husky + lint-staged. Do not bypass with --no-verify.
