package com.recoverpro.server.service;

import com.recoverpro.server.config.StripeConfig;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression test for the Stripe Checkout return URLs.
 *
 * <p>The URLs Stripe redirects to are one half of a contract whose other half
 * lives in {@code web/src/pages/SubscriptionPage.tsx}:
 *
 * <pre>
 *   const checkoutStatus = new URLSearchParams(location.search).get('checkout');
 *   if (checkoutStatus === 'success') ... // "Payment successful"
 *   if (checkoutStatus === 'cancel')  ... // "Checkout cancelled"
 * </pre>
 *
 * <p>They drifted apart: this service sent {@code ?success=true} and
 * {@code ?cancelled=true}, neither of which that page matches, so a user who
 * completed payment landed back on a screen that said nothing. Nothing failed,
 * nothing logged -- the two files were each internally consistent and only wrong
 * together, which is exactly the kind of break no single-file test catches.
 *
 * <p>These assertions therefore encode the FRONTEND's expectation, not this
 * class's current output. If you change them, change SubscriptionPage.tsx in the
 * same commit.
 */
@ExtendWith(MockitoExtension.class)
class StripeServiceReturnUrlTest {

    @Mock
    private OrgSubscriptionRepository subRepo;

    private StripeService stripeService;

    @BeforeEach
    void setUp() {
        StripeConfig config = new StripeConfig();
        setField(config, "baseUrl", "https://app.example.test");
        stripeService = new StripeService(config, subRepo);
    }

    @Test
    void successUrl_usesCheckoutParamTheSubscriptionPageReads() {
        String url = stripeService.checkoutReturnUrl(StripeService.CHECKOUT_SUCCESS);

        assertThat(url).isEqualTo("https://app.example.test/app/subscription?checkout=success");
    }

    @Test
    void cancelUrl_usesCheckoutParamTheSubscriptionPageReads() {
        String url = stripeService.checkoutReturnUrl(StripeService.CHECKOUT_CANCEL);

        // 'cancel', not 'cancelled' -- SubscriptionPage.tsx compares against 'cancel'.
        assertThat(url).isEqualTo("https://app.example.test/app/subscription?checkout=cancel");
    }

    @Test
    void returnUrls_landOnTheRouteAppTsxActuallyRegisters() {
        // App.tsx declares <Route path="/app/subscription" .../>; a redirect to any
        // other path would render the 404 fallback after a successful payment.
        assertThat(stripeService.checkoutReturnUrl(StripeService.CHECKOUT_SUCCESS))
                .contains("/app/subscription?");
        assertThat(stripeService.checkoutReturnUrl(StripeService.CHECKOUT_CANCEL))
                .contains("/app/subscription?");
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
