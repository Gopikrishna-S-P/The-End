package com.recoverpro.server.common.exception;

/**
 * Provider-agnostic wrapper around a payment gateway's own SDK exception (Stripe's
 * {@code StripeException}, a future Razorpay adapter's own exception type). Callers depending on
 * {@link com.recoverpro.server.service.PaymentProvider} catch this instead of a provider-specific
 * type, so switching which provider backs an org doesn't ripple into every catch block.
 */
public class PaymentProviderException extends BusinessException {

    public PaymentProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
