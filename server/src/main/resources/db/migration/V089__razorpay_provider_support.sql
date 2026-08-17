-- =============================================================================
-- V089__razorpay_provider_support.sql
-- =============================================================================
-- Razorpay has its own customer/subscription id namespace, separate from
-- Stripe's -- an org can only be on one provider at a time, but both id pairs
-- coexist on the row so a future migrated-org keeps its Stripe history
-- alongside its new Razorpay ids rather than overwriting it.
--
-- `provider` defaults to STRIPE for every existing row (unchanged behavior for
-- current subscribers) and is NOT flipped to RAZORPAY for new signups by this
-- migration -- that default switch is a deliberate, separate decision requiring
-- real Razorpay credentials configured and tested first, not something this
-- migration should silently do (Billing Ledger design doc: migration path).
-- =============================================================================

ALTER TABLE org_subscriptions ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'STRIPE';
ALTER TABLE org_subscriptions ADD CONSTRAINT chk_org_subscriptions_provider
    CHECK (provider IN ('STRIPE', 'RAZORPAY'));

ALTER TABLE org_subscriptions ADD COLUMN razorpay_customer_id VARCHAR(64);
ALTER TABLE org_subscriptions ADD COLUMN razorpay_subscription_id VARCHAR(64);

CREATE INDEX idx_sub_razorpay_customer ON org_subscriptions (razorpay_customer_id);
CREATE INDEX idx_sub_razorpay_sub ON org_subscriptions (razorpay_subscription_id);
