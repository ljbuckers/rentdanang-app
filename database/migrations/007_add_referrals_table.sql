-- 007: Property management referral tracking
-- Tracks which leads get referred to local property management companies

CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    company_name VARCHAR(100) NOT NULL,
    company_email VARCHAR(255),
    referral_fee DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'sent',
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_referrals_lead ON referrals(lead_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_paid ON referrals(paid) WHERE paid = false;
