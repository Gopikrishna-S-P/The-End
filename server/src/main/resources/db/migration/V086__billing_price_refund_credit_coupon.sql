-- =============================================================================
-- V086__billing_price_refund_credit_coupon.sql
-- =============================================================================
-- Phase 1 (Billing Ledger design doc) -- purely additive, zero change to the
-- existing working Stripe billing flow. Adds:
--   - prices: local, versioned pricing catalog. Not a replacement for Stripe/
--     Razorpay as the source of truth for what a customer is actually charged --
--     it exists so both providers can resolve to the same plan/interval/currency
--     concept during the Stripe -> Razorpay migration, and so MRR/ARR reporting
--     stops depending on which provider a given org happens to be on. Rows are
--     never mutated once referenced by a live subscription: a price change
--     inserts a new row and flips the old one's active flag, so historical MRR
--     stays accurate without touching invoice history at all.
--   - invoice_line_items: breakdown for platform_invoices, populated from the
--     provider's own invoice line data at webhook-mirror time. platform_invoices
--     itself is untouched -- still a flat-total Stripe/Razorpay mirror; this is
--     additive detail, not a competing source of truth.
--   - refunds, credits, coupons: genuinely new concepts, zero prior art in this
--     codebase for SaaS billing (confirmed via full-codebase search before this
--     migration was written).
--   - feature_flags.limit_value: extends the existing boolean-only entitlement
--     table with an optional numeric limit (max_users, max_loans, etc.) rather
--     than building a parallel Entitlement hierarchy. NULL preserves today's
--     boolean-flag behavior exactly; non-NULL is a numeric entitlement.
--
-- All money columns are integer minor units (paise) + a currency column, no
-- exceptions -- closing the rupees-vs-paise inconsistency between
-- OrgSubscription.planAmount and PlatformInvoice.amountDue/amountPaid rather
-- than repeating it in new tables. The planAmount fix itself is deliberately
-- NOT bundled into this migration: it touches StripeWebhookService,
-- PlatformAnalyticsService, and revenue-reporting call sites, which is real
-- cross-cutting change that deserves its own reviewed, tested pass rather than
-- riding in on an otherwise purely-additive migration.
-- =============================================================================

CREATE TABLE prices (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    plan                VARCHAR(20)     NOT NULL,
    billing_interval    VARCHAR(10)     NOT NULL,
    interval_count      INT             NOT NULL DEFAULT 1,
    currency            VARCHAR(3)      NOT NULL,
    amount_minor_units  BIGINT          NOT NULL,
    active              BOOLEAN         NOT NULL DEFAULT true,
    effective_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    stripe_price_id     VARCHAR(100),
    razorpay_plan_id    VARCHAR(100),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (id),

    CONSTRAINT chk_prices_plan CHECK (plan IN ('NONE', 'STARTER', 'GROWTH', 'ENTERPRISE')),
    CONSTRAINT chk_prices_interval CHECK (billing_interval IN ('MONTHLY', 'YEARLY')),
    CONSTRAINT chk_prices_amount_positive CHECK (amount_minor_units >= 0)
);

CREATE INDEX idx_prices_plan_active ON prices (plan, active);
CREATE UNIQUE INDEX idx_prices_stripe_id ON prices (stripe_price_id) WHERE stripe_price_id IS NOT NULL;
CREATE UNIQUE INDEX idx_prices_razorpay_id ON prices (razorpay_plan_id) WHERE razorpay_plan_id IS NOT NULL;

-- No RLS: this is a global pricing catalog, not tenant data. Write access is
-- restricted at the application/controller layer (platform admin only), same
-- posture as system-wide reference data like organization-null roles.

CREATE TABLE invoice_line_items (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    invoice_id      UUID            NOT NULL REFERENCES platform_invoices(id),
    description     TEXT            NOT NULL,
    quantity        INT             NOT NULL DEFAULT 1,
    unit_amount     BIGINT          NOT NULL,
    tax_rate_bps    INT,
    line_total      BIGINT          NOT NULL,
    currency        VARCHAR(3)      NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (id)
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items (invoice_id);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_invoice_line_items_isolation ON invoice_line_items
    USING (invoice_id IN (SELECT id FROM platform_invoices WHERE org_id = current_org_id())
        OR current_setting('app.is_platform_admin', true) = 'true');

CREATE TABLE refunds (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    invoice_id              UUID            NOT NULL REFERENCES platform_invoices(id),
    amount_minor_units      BIGINT          NOT NULL,
    reason                  TEXT            NOT NULL,
    initiated_by_user_id    UUID            NOT NULL REFERENCES users(id),
    provider_refund_id      VARCHAR(100),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (id),

    CONSTRAINT chk_refunds_amount_positive CHECK (amount_minor_units > 0),
    CONSTRAINT chk_refunds_status CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED'))
);

CREATE INDEX idx_refunds_invoice ON refunds (invoice_id);
CREATE UNIQUE INDEX idx_refunds_provider_id ON refunds (provider_refund_id) WHERE provider_refund_id IS NOT NULL;

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_refunds_isolation ON refunds
    USING (invoice_id IN (SELECT id FROM platform_invoices WHERE org_id = current_org_id())
        OR current_setting('app.is_platform_admin', true) = 'true');

-- Refunds are financial evidence -- immutable once written, same posture as
-- the audit tables. A correction is a new refund row (e.g. a FAILED retry
-- becoming a second SUCCEEDED attempt), never an edit of history. Status
-- progression (PENDING -> SUCCEEDED/FAILED) happens exactly once per row via
-- application code before the row is considered final; there is no in-place
-- "update status later" path, so blocking UPDATE entirely (rather than only
-- blocking post-terminal-state updates) matches how this table is actually
-- written -- see RefundServiceImpl (future phase) for the write path.
CREATE TRIGGER trg_refunds_immutable
    BEFORE UPDATE OR DELETE ON refunds
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

CREATE TABLE credits (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    organization_id         UUID            NOT NULL REFERENCES organizations(id),
    amount_minor_units      BIGINT          NOT NULL,
    currency                VARCHAR(3)      NOT NULL,
    reason                  TEXT            NOT NULL,
    issued_by_user_id       UUID            NOT NULL REFERENCES users(id),
    provider_credit_ref     VARCHAR(100),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (id),

    CONSTRAINT chk_credits_amount_positive CHECK (amount_minor_units > 0)
);

CREATE INDEX idx_credits_org ON credits (organization_id, created_at DESC);

ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_credits_isolation ON credits
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

-- Traceability is the whole point of this table (Billing Ledger design doc
-- §10) -- immutable for the same reason refunds are.
CREATE TRIGGER trg_credits_immutable
    BEFORE UPDATE OR DELETE ON credits
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

CREATE TABLE coupons (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    code                VARCHAR(50)     NOT NULL,
    discount_type       VARCHAR(20)     NOT NULL,
    discount_value      BIGINT          NOT NULL,
    max_redemptions     INT,
    expires_at          TIMESTAMPTZ,
    provider_coupon_id  VARCHAR(100),
    active              BOOLEAN         NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (id),

    CONSTRAINT uq_coupons_code UNIQUE (code),
    CONSTRAINT chk_coupons_discount_type CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    CONSTRAINT chk_coupons_discount_value_positive CHECK (discount_value > 0)
);

-- No RLS: global catalog, same reasoning as prices.

ALTER TABLE feature_flags ADD COLUMN limit_value BIGINT;
