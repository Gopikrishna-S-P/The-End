-- =============================================================================
-- V054__platform_invoices.sql  --  Local mirror of Stripe invoices.
-- =============================================================================
-- PlatformSubscriptionController GET /{orgId}/invoices calls Stripe live on
-- every request, and /revenue-trend derives its figures from
-- org_subscriptions.plan_amount. That leaves two gaps this table closes:
--
--   1. Cross-org totals are impossible. Answering "how much money actually came
--      in last month" means one Stripe API call per customer, so the question is
--      never asked and the console shows CONTRACTED revenue instead -- active
--      subs x plan amount. That figure cannot see a failed charge, a proration,
--      a refund or a credit note, so it overstates real income silently.
--
--   2. The billing console goes blank whenever Stripe is slow or down.
--
-- Rows are written only by StripeWebhookService on invoice.* events and by the
-- one-shot backfill endpoint. Stripe stays the system of record; everything here
-- is a cache of its values.
--
-- NO ROW LEVEL SECURITY, deliberately, despite V053 having just closed the last
-- un-RLS'd *tenant* table. Two reasons:
--   * This is platform billing infrastructure, not tenant data -- it sits beside
--     org_subscriptions, which V010's and V040's sweeps likewise left un-RLS'd.
--     It is read by PLATFORM_ADMIN only, cross-tenant by design.
--   * The writer is the Stripe webhook, which arrives with no JWT and therefore
--     no tenant context, so current_org_id() is null. An isolation policy would
--     apply as the WITH CHECK expression on INSERT (see V053's note) and block
--     the very writes this table exists to record.
-- If an org-facing "my invoices" screen is ever built, it must scope by org_id
-- in the query rather than rely on a policy that cannot exist here.
--
-- Amounts are in the smallest currency unit (paise for INR), exactly as Stripe
-- reports them. Do NOT convert on write. Note this differs from
-- org_subscriptions.plan_amount, which V048 stores in rupees.
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_invoices (
    id                  UUID PRIMARY KEY,
    org_id              UUID        NOT NULL REFERENCES organizations(id),
    stripe_invoice_id   VARCHAR(64) NOT NULL UNIQUE,
    stripe_customer_id  VARCHAR(64),
    number              VARCHAR(64),
    status              VARCHAR(32) NOT NULL,
    amount_due          BIGINT      NOT NULL DEFAULT 0,
    amount_paid         BIGINT      NOT NULL DEFAULT 0,
    currency            VARCHAR(3)  NOT NULL DEFAULT 'inr',
    period_start        TIMESTAMPTZ,
    period_end          TIMESTAMPTZ,
    issued_at           TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ,
    hosted_invoice_url  TEXT,
    invoice_pdf_url     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-org invoice history, newest first -- the drawer query.
CREATE INDEX IF NOT EXISTS idx_platform_invoices_org_issued
    ON platform_invoices (org_id, issued_at DESC);

-- Revenue aggregation only ever scans settled rows; partial index keeps it narrow.
CREATE INDEX IF NOT EXISTS idx_platform_invoices_paid_at
    ON platform_invoices (paid_at)
    WHERE status = 'paid';
