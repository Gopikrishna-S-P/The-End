package com.recoverpro.server.service;

import com.recoverpro.server.enums.PaymentProviderType;

import java.util.UUID;

/**
 * Two concrete {@link PaymentProvider} beans exist (Stripe, Razorpay) once both are wired, so
 * nothing may inject the bare {@link PaymentProvider} interface directly -- Spring can't resolve
 * which one without a qualifier, and "which one" is itself a runtime, per-org decision
 * ({@code OrgSubscription.provider}), not a compile-time wiring choice. Callers resolve through
 * here instead.
 */
public interface PaymentProviderResolver {

    PaymentProvider resolve(PaymentProviderType type);

    /** Looks up the org's own {@code OrgSubscription.provider}; falls back to the configured
     *  default provider ({@code app.billing.default-provider}) for an org with no subscription
     *  row yet (e.g. its very first checkout). */
    PaymentProvider resolveForOrg(UUID orgId);
}
