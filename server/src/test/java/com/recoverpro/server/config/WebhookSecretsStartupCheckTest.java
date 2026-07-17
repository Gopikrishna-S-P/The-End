package com.recoverpro.server.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

class WebhookSecretsStartupCheckTest {

    @Test
    void stripeEnabledWithEmptyWebhookSecret_refusesToStart() {
        StripeConfig stripeConfig = stripeConfig("sk_live_123", "");
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig, new DlrProvidersProperties());

        assertThatIllegalStateException()
                .isThrownBy(check::verify)
                .withMessageContaining("app.stripe.webhook-secret");
    }

    @Test
    void stripeEnabledWithWebhookSecretSet_startsCleanly() {
        StripeConfig stripeConfig = stripeConfig("sk_live_123", "whsec_abc");
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig, new DlrProvidersProperties());

        assertThatCode(check::verify).doesNotThrowAnyException();
    }

    @Test
    void stripeDisabled_emptyWebhookSecretIsFine() {
        StripeConfig stripeConfig = stripeConfig("", "");
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig, new DlrProvidersProperties());

        assertThatCode(check::verify).doesNotThrowAnyException();
    }

    @Test
    void dlrProviderConfiguredWithoutSecret_refusesToStart() {
        DlrProvidersProperties dlr = new DlrProvidersProperties();
        DlrProvidersProperties.ProviderConfig pc = new DlrProvidersProperties.ProviderConfig();
        pc.setSecret("");
        dlr.getProviders().put("twilio", pc);
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig("", ""), dlr);

        assertThatIllegalStateException()
                .isThrownBy(check::verify)
                .withMessageContaining("twilio");
    }

    @Test
    void dlrProviderConfiguredWithSecret_startsCleanly() {
        DlrProvidersProperties dlr = new DlrProvidersProperties();
        DlrProvidersProperties.ProviderConfig pc = new DlrProvidersProperties.ProviderConfig();
        pc.setSecret("s3cr3t");
        dlr.getProviders().put("twilio", pc);
        WebhookSecretsStartupCheck check = new WebhookSecretsStartupCheck(stripeConfig("", ""), dlr);

        assertThatCode(check::verify).doesNotThrowAnyException();
    }

    private static StripeConfig stripeConfig(String secretKey, String webhookSecret) {
        StripeConfig config = new StripeConfig();
        org.springframework.test.util.ReflectionTestUtils.setField(config, "secretKey", secretKey);
        org.springframework.test.util.ReflectionTestUtils.setField(config, "webhookSecret", webhookSecret);
        return config;
    }
}
