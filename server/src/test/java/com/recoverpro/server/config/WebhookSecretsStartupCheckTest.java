package com.recoverpro.server.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

class WebhookSecretsStartupCheckTest {

    @Test
    void stripeEnabledWithEmptyWebhookSecret_refusesToStart() {
        StripeConfig stripeConfig = stripeConfig("sk_live_123", "");
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig);

        assertThatIllegalStateException()
                .isThrownBy(check::verify)
                .withMessageContaining("app.stripe.webhook-secret");
    }

    @Test
    void stripeEnabledWithWebhookSecretSet_startsCleanly() {
        StripeConfig stripeConfig = stripeConfig("sk_live_123", "whsec_abc");
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig);

        assertThatCode(check::verify).doesNotThrowAnyException();
    }

    @Test
    void stripeDisabled_emptyWebhookSecretIsFine() {
        StripeConfig stripeConfig = stripeConfig("", "");
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig);

        assertThatCode(check::verify).doesNotThrowAnyException();
    }

    private static StripeConfig stripeConfig(String secretKey, String webhookSecret) {
        StripeConfig config = new StripeConfig();
        org.springframework.test.util.ReflectionTestUtils.setField(config, "secretKey", secretKey);
        org.springframework.test.util.ReflectionTestUtils.setField(config, "webhookSecret", webhookSecret);
        return config;
    }
}
