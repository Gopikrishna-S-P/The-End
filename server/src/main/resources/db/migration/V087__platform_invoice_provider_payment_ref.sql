-- =============================================================================
-- V087__platform_invoice_provider_payment_ref.sql
-- =============================================================================
-- Refunds need to know which actual payment (Stripe PaymentIntent, a future
-- Razorpay payment id) an invoice was settled by -- platform_invoices had no
-- such reference, only the invoice id itself, which isn't refundable directly.
-- Populated at webhook-mirror time (StripeWebhookService.upsertInvoice), where
-- the provider's own Invoice object already carries it at no extra API call;
-- resolving it lazily at refund time would mean RefundServiceImpl needing
-- direct provider-SDK knowledge, defeating the point of PaymentProvider.
-- =============================================================================

ALTER TABLE platform_invoices ADD COLUMN provider_payment_ref VARCHAR(100);
