-- =============================================================================
-- V090__processed_razorpay_events.sql
-- =============================================================================
-- Webhook dedup for Razorpay, same role as processed_stripe_events (V005) for
-- Stripe. Deliberately a separate table rather than generalizing
-- processed_stripe_events into a shared (provider, event_id) table: that would
-- mean renaming/repointing a live table the working Stripe webhook flow
-- depends on today, for a provider that isn't live yet -- real risk for no
-- benefit while Razorpay is unproven. Same pattern as this session's other
-- "new table alongside, don't touch working existing" calls.
-- =============================================================================

CREATE TABLE IF NOT EXISTS processed_razorpay_events (
    event_id     VARCHAR(64)  NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (event_id)
);
