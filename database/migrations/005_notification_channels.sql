-- 005: Add notification support to users and saved_searches
-- Run after 004_listing_lifecycle_events.sql

-- =============================================================
-- USERS: notification fields
-- =============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================================
-- SAVED_SEARCHES: per-channel notification preferences
-- =============================================================
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true;
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT false;
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN DEFAULT false;

-- =============================================================
-- NOTIFICATION_LOG: track all sent notifications
-- =============================================================
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saved_search_id UUID REFERENCES saved_searches(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL,  -- 'email', 'sms', 'whatsapp'
    status VARCHAR(20) DEFAULT 'sent',  -- 'sent', 'failed', 'bounced'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_listing ON notification_log(listing_id);

-- =============================================================
-- DIGEST_QUEUE: batch listings for daily/weekly digest emails
-- =============================================================
CREATE TABLE IF NOT EXISTS digest_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(saved_search_id, listing_id)
);
