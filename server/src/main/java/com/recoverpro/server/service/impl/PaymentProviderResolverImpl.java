package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.enums.PaymentProviderType;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.service.PaymentProvider;
import com.recoverpro.server.service.PaymentProviderResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Depends on the two concrete provider classes directly, not the {@link PaymentProvider}
 * interface -- that's what lets this bean itself be constructed at all despite two beans
 * implementing that interface existing in the context.
 */
@Service
@RequiredArgsConstructor
public class PaymentProviderResolverImpl implements PaymentProviderResolver {

    private final StripePaymentProvider stripePaymentProvider;
    private final RazorpayPaymentProvider razorpayPaymentProvider;
    private final OrgSubscriptionRepository subRepo;

    /** Unchanged behavior for every existing subscriber until explicitly flipped -- see the
     *  Billing Ledger design doc's migration path: cutting new signups to Razorpay is a
     *  deliberate, separate decision once real Razorpay credentials are configured and tested,
     *  not something any code change should do silently. */
    @Value("${app.billing.default-provider:STRIPE}")
    private PaymentProviderType defaultProvider;

    @Override
    public PaymentProvider resolve(PaymentProviderType type) {
        return switch (type) {
            case STRIPE -> stripePaymentProvider;
            case RAZORPAY -> razorpayPaymentProvider;
        };
    }

    @Override
    public PaymentProvider resolveForOrg(UUID orgId) {
        PaymentProviderType type = subRepo.findByOrgId(orgId)
                .map(OrgSubscription::getProvider)
                .orElse(defaultProvider);
        return resolve(type);
    }
}
