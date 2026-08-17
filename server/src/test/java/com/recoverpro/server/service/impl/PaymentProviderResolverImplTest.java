package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.enums.PaymentProviderType;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.service.PaymentProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentProviderResolverImplTest {

    @Mock private StripePaymentProvider stripePaymentProvider;
    @Mock private RazorpayPaymentProvider razorpayPaymentProvider;
    @Mock private OrgSubscriptionRepository subRepo;

    private PaymentProviderResolverImpl resolver;

    @BeforeEach
    void setUp() throws Exception {
        resolver = new PaymentProviderResolverImpl(stripePaymentProvider, razorpayPaymentProvider, subRepo);
        setDefaultProvider(resolver, PaymentProviderType.STRIPE);
    }

    private static void setDefaultProvider(PaymentProviderResolverImpl target, PaymentProviderType type)
            throws Exception {
        Field f = PaymentProviderResolverImpl.class.getDeclaredField("defaultProvider");
        f.setAccessible(true);
        f.set(target, type);
    }

    @Test
    void resolve_stripe_returnsStripeProvider() {
        assertThat(resolver.resolve(PaymentProviderType.STRIPE)).isSameAs(stripePaymentProvider);
    }

    @Test
    void resolve_razorpay_returnsRazorpayProvider() {
        assertThat(resolver.resolve(PaymentProviderType.RAZORPAY)).isSameAs(razorpayPaymentProvider);
    }

    @Test
    void resolveForOrg_existingSubscriptionOnRazorpay_returnsRazorpayProvider() {
        UUID orgId = UUID.randomUUID();
        OrgSubscription sub = OrgSubscription.builder().orgId(orgId).provider(PaymentProviderType.RAZORPAY).build();
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.of(sub));

        PaymentProvider result = resolver.resolveForOrg(orgId);

        assertThat(result).isSameAs(razorpayPaymentProvider);
    }

    @Test
    void resolveForOrg_noSubscriptionYet_fallsBackToConfiguredDefault() {
        UUID orgId = UUID.randomUUID();
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.empty());

        PaymentProvider result = resolver.resolveForOrg(orgId);

        assertThat(result).isSameAs(stripePaymentProvider);
    }
}
