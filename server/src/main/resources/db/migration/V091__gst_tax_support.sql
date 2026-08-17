-- =============================================================================
-- V091__gst_tax_support.sql
-- =============================================================================
-- Schema for Indian GST support on RecoverPro's own SaaS invoices (billing to
-- organizations, not loan-repayment collections). This migration builds the
-- DATA MODEL only -- it does not wire automatic GST computation into any
-- webhook flow. Whether Stripe Tax is already configured on the account,
-- whether e-invoicing (IRN) is legally required for RecoverPro, and the exact
-- correct GST rate for this specific service category are all open questions
-- that need confirmation from an accountant, not something this migration or
-- the code built on top of it should assert. See GstCalculator's javadoc.
--
-- gstin lives on org_subscriptions (the existing billing-identity home for an
-- org -- see the "no separate BillingAccount" decision from the Billing
-- Ledger design doc) rather than a new table. billing_state_code is NOT a
-- separately stored column: an Indian GSTIN's first two characters ARE the
-- registered state code by definition (a fixed part of the national GSTIN
-- format, not something that can drift out of sync if stored redundantly), so
-- it is derived from gstin at read time (see Gstin.stateCode) instead.
--
-- The GSTIN format check below is the actual CBIC-specified structure (2-digit
-- state code + 10-char PAN + 1-digit entity number + literal 'Z' + 1
-- checksum char) -- this format has been stable and unchanged since GST's
-- 2017 rollout, unlike the tax rate itself, so it is safe to enforce as a
-- hard constraint rather than flag as uncertain.
-- =============================================================================

ALTER TABLE org_subscriptions ADD COLUMN gstin VARCHAR(15);
ALTER TABLE org_subscriptions ADD COLUMN billing_legal_name VARCHAR(255);
ALTER TABLE org_subscriptions ADD CONSTRAINT chk_org_subscriptions_gstin_format
    CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');

-- Replaces the single generic tax_rate_bps total with a GST-compliant
-- breakdown: an Indian tax invoice must show CGST/SGST/IGST as separate line
-- amounts, not a lump "tax" figure. tax_rate_bps (V086) is kept as the overall
-- rate that was applied, for reference/display.
ALTER TABLE invoice_line_items ADD COLUMN cgst_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE invoice_line_items ADD COLUMN sgst_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE invoice_line_items ADD COLUMN igst_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE invoice_line_items ADD COLUMN place_of_supply_state_code VARCHAR(2);
