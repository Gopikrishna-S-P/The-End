-- Dedup table for Stripe webhook events.
-- Stripe retries webhooks on non-2xx or timeout. This table ensures each
-- event_id is processed exactly once regardless of retry count.
CREATE TABLE IF NOT EXISTS processed_stripe_events (
    event_id     VARCHAR(64)  NOT NULL PRIMARY KEY,
    event_type   VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
