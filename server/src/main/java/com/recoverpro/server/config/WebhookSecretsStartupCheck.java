package com.recoverpro.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Refuses to start rather than silently accepting unverifiable webhook calls:
 * an enabled webhook integration with an empty signing secret would let
 * {@code Webhook.constructEvent}/HMAC checks either throw on every call or,
 * for DLR, fall through to the "unknown provider" branch depending on
 * {@code app.cadence.dlr.strict}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookSecretsStartupCheck {

    private final StripeConfig stripeConfig;
    private final DlrProvidersProperties dlrProvidersProperties;

    @EventListener(ApplicationReadyEvent.class)
    void verify() {
        if (isSet(stripeConfig.getSecretKey()) && !isSet(stripeConfig.getWebhookSecret())) {
            throw new IllegalStateException(
                    "Stripe is enabled (app.stripe.secret-key is set) but app.stripe.webhook-secret is empty. "
                            + "Refusing to start: signature verification cannot fail closed with no secret.");
        }

        for (Map.Entry<String, DlrProvidersProperties.ProviderConfig> entry : dlrProvidersProperties.getProviders().entrySet()) {
            if (!isSet(entry.getValue().getSecret())) {
                throw new IllegalStateException(
                        "DLR provider '" + entry.getKey() + "' is configured (app.cadence.dlr.providers."
                                + entry.getKey() + ") but has no secret. Refusing to start: an unsecreted "
                                + "provider entry can never verify a signature.");
            }
        }

        if (!dlrProvidersProperties.isStrict()) {
            log.warn("app.cadence.dlr.strict=false - unknown DLR providers will be accepted WITHOUT signature "
                    + "verification. This must not be set in production.");
        }
    }

    private static boolean isSet(String value) {
        return value != null && !value.isBlank();
    }
}
