-- Migration: Add Telegram notification support
-- Run: sudo -u postgres psql -d rentdanang -f db/migrations/001_add_telegram_columns.sql

ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_saved_searches_telegram 
  ON saved_searches(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_searches_alerts 
  ON saved_searches(alert_enabled) WHERE alert_enabled = true;

-- Track the last listing ID we sent alerts for, to avoid duplicates
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS last_alert_listing_time 
  TIMESTAMP WITH TIME ZONE DEFAULT '2000-01-01'::timestamptz;
