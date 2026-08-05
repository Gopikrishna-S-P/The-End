-- ── org_subscriptions ────────────────────────────────────────────────────────
-- Backs the OrgSubscription entity (per-organization Stripe plan + trial state).
CREATE TABLE IF NOT EXISTS org_subscriptions (
    id                   UUID         NOT NULL DEFAULT gen_random_uuid(),
    org_id               UUID         NOT NULL,
    stripe_customer_id   VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status               VARCHAR(20)  NOT NULL DEFAULT 'TRIAL',
    plan                 VARCHAR(20)  NOT NULL DEFAULT 'NONE',
    trial_ends_at        TIMESTAMP WITHOUT TIME ZONE,
    current_period_end   TIMESTAMP WITHOUT TIME ZONE,
    cancel_at_period_end BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP WITHOUT TIME ZONE,
    updated_at           TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT fk_sub_org FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_org_id         ON org_subscriptions (org_id);
CREATE INDEX        IF NOT EXISTS idx_sub_stripe_customer ON org_subscriptions (stripe_customer_id);
CREATE INDEX        IF NOT EXISTS idx_sub_stripe_sub      ON org_subscriptions (stripe_subscription_id);
