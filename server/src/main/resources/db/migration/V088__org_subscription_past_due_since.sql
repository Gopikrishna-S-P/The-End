-- =============================================================================
-- V088__org_subscription_past_due_since.sql
-- =============================================================================
-- Drives DunningScheduler's grace-period countdown (Billing Ledger design doc
-- §12). Set once when status first becomes PAST_DUE, cleared on recovery back
-- to ACTIVE -- see StripeWebhookService.handleInvoicePaymentFailed/handleInvoicePaid.
-- =============================================================================

ALTER TABLE org_subscriptions ADD COLUMN past_due_since TIMESTAMPTZ;
