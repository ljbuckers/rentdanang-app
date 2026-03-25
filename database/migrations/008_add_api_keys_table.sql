-- API keys for the RentDaNang Data API
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key VARCHAR(64) UNIQUE NOT NULL,
    tier VARCHAR(20) DEFAULT 'free',
    user_email VARCHAR(255),
    calls_today INTEGER DEFAULT 0,
    calls_total INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);

-- Daily reset function (called via cron at midnight UTC)
CREATE OR REPLACE FUNCTION reset_daily_calls()
RETURNS void AS $$
BEGIN
    UPDATE api_keys SET calls_today = 0;
END;
$$ LANGUAGE plpgsql;
