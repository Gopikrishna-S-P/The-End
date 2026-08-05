package com.recoverpro.server.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression test: StripeConfig's @Value keys must match the
 * application.properties namespace ({@code app.stripe.*}), or the
 * webhook secret and API key silently resolve to their blank defaults
 * even when the environment variables are set.
 */
@SpringBootTest(classes = StripeConfig.class)
@TestPropertySource(properties = {
        "app.stripe.secret-key=sk_test_123",
        "app.stripe.publishable-key=pk_test_123",
        "app.stripe.webhook-secret=whsec_test_123",
        "app.stripe.trial-days=30",
        "app.stripe.price.starter=price_starter_123",
        "app.stripe.price.growth=price_growth_123",
        "app.stripe.price.enterprise=price_enterprise_123",
        "app.base-url=https://app.example.test"
})
class StripeConfigTest {

    @Autowired
    private StripeConfig stripeConfig;

    @Test
    void bindsAllPropertiesFromAppStripeNamespace() {
        assertThat(stripeConfig.getSecretKey()).isEqualTo("sk_test_123");
        assertThat(stripeConfig.getPublishableKey()).isEqualTo("pk_test_123");
        assertThat(stripeConfig.getWebhookSecret()).isEqualTo("whsec_test_123");
        assertThat(stripeConfig.getTrialDays()).isEqualTo(30);
        assertThat(stripeConfig.getPriceStarter()).isEqualTo("price_starter_123");
        assertThat(stripeConfig.getPriceGrowth()).isEqualTo("price_growth_123");
        assertThat(stripeConfig.getPriceEnterprise()).isEqualTo("price_enterprise_123");
        assertThat(stripeConfig.getBaseUrl()).isEqualTo("https://app.example.test");
    }
}
