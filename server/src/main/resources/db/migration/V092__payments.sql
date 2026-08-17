-- =============================================================================
-- V092__payments.sql
-- =============================================================================
-- Local record of individual payment attempts (Billing Ledger design doc §24,
-- a genuine gap: RecoverPro previously had no record of a payment as a
-- distinct thing from an invoice -- only PlatformInvoice's amount_paid/status
-- and Refund existed). Same mirror philosophy as PlatformInvoice: the
-- provider is the system of record, this table is a synced cache, upserted
-- keyed on (provider, provider_payment_id) exactly like PlatformInvoice is
-- upserted keyed on stripe_invoice_id.
--
-- NOT immutable/append-only like Refund or Credit: a payment's status
-- genuinely progresses over its own lifecycle (created -> captured, or
-- created -> failed) as further webhook events arrive for the SAME payment
-- id, so blocking UPDATE here would be wrong, unlike Refund/Credit where one
-- row is written exactly once and represents a completed, singular event.
--
-- Never stores card/payment-instrument details -- only what the provider's
-- own payment object exposes at the identifier/status/amount level
-- (payment_method_type is a coarse category like "card"/"upi", never a card
-- number, last4, or any PAN-adjacent value).
-- =============================================================================

CREATE TABLE payments (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    organization_id         UUID            NOT NULL REFERENCES organizations(id),
    invoice_id              UUID            REFERENCES platform_invoices(id),
    provider                VARCHAR(20)     NOT NULL,
    provider_payment_id     VARCHAR(100)    NOT NULL,
    amount_minor_units      BIGINT          NOT NULL,
    currency                VARCHAR(3)      NOT NULL,
    status                  VARCHAR(30)     NOT NULL,
    payment_method_type     VARCHAR(30),
    failure_reason          TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    captured_at             TIMESTAMPTZ,
    failed_at               TIMESTAMPTZ,

    PRIMARY KEY (id),

    CONSTRAINT chk_payments_provider CHECK (provider IN ('STRIPE', 'RAZORPAY')),
    CONSTRAINT uq_payments_provider_payment_id UNIQUE (provider, provider_payment_id)
);

CREATE INDEX idx_payments_org ON payments (organization_id, created_at DESC);
CREATE INDEX idx_payments_invoice ON payments (invoice_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_payments_isolation ON payments
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
