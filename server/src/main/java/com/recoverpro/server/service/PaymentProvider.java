package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.PaymentProviderException;

import java.util.UUID;

/**
 * Provider-agnostic surface for the operations RecoverPro's own SaaS billing actually needs
 * (Billing Ledger design doc §7) -- deliberately scoped to what {@code SubscriptionController}
 * uses plus the refund/cancel capability {@code Refund}/dunning need, not a speculative universal
 * payment interface. Kept at the same "org-level" altitude {@code StripeService} already uses
 * (methods take an org id, not a raw provider customer id) -- that's the existing design's own
 * abstraction level, not something invented for this interface.
 * <p>
 * Read-only reporting paths ({@code listInvoices}, used only by the platform-admin billing
 * console) are deliberately NOT part of this interface -- unifying a provider-specific SDK model
 * type into a generic wrapper buys little for a read path and isn't needed for either provider to
 * coexist correctly.
 */
public interface PaymentProvider {

    /** Starts a hosted checkout flow for a new or plan-changing subscription; returns the URL to
     *  redirect the caller to. Implicitly creates a provider customer for the org if one doesn't
     *  exist yet. */
    String createCheckoutUrl(UUID orgId, String planName) throws PaymentProviderException;

    /** Returns a hosted self-service billing management URL for an org that already has a
     *  provider customer. */
    String createPortalUrl(UUID orgId) throws PaymentProviderException;

    /** {@code atPeriodEnd = true} lets the current billing period run out before cancelling
     *  (the default, expected path); {@code false} cancels immediately. */
    void cancelSubscription(UUID orgId, boolean atPeriodEnd) throws PaymentProviderException;

    /** {@code providerPaymentRef} is the provider's own payment reference (a Stripe PaymentIntent
     *  id, a Razorpay payment id) -- callers resolve which payment a refund applies to before
     *  calling this; the interface doesn't know how to derive one from a local invoice id, since
     *  that mapping is provider-specific. */
    RefundResult refundPayment(String providerPaymentRef, Long amountMinorUnits, String reason)
            throws PaymentProviderException;
}
