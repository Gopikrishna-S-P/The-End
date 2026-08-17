package com.recoverpro.server.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Mirrors {@link StripeConfig}'s shape exactly: key material + provider-side plan/price
 * reference ids from config, never hardcoded amounts. {@code planStarter}/{@code planGrowth}/
 * {@code planEnterprise} are Razorpay Plan ids (created via the Razorpay dashboard or API ahead
 * of time), the same role Stripe's {@code price.*} config plays for {@link StripeConfig}.
 */
@Slf4j
@Getter
@Configuration
public class RazorpayConfig {

    @Value("${app.razorpay.key-id:}")
    private String keyId;

    @Value("${app.razorpay.key-secret:}")
    private String keySecret;

    @Value("${app.razorpay.webhook-secret:}")
    private String webhookSecret;

    @Value("${app.razorpay.trial-days:14}")
    private int trialDays;

    @Value("${app.razorpay.plan.starter:}")
    private String planStarter;

    @Value("${app.razorpay.plan.growth:}")
    private String planGrowth;

    @Value("${app.razorpay.plan.enterprise:}")
    private String planEnterprise;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    /** Null until {@link #init()} runs with real credentials configured. Deliberately not
     *  exposed as its own Spring {@code @Bean} -- injecting a possibly-null bean instance
     *  depends on Spring's NullBean autowiring behavior, which is fragile to rely on. Callers
     *  (RazorpayPaymentProvider) go through {@link #getClient()} and check for null explicitly. */
    private RazorpayClient client;

    /**
     * Built once at startup, not per-call: {@link RazorpayClient}'s constructor does its own
     * auth-header setup and the SDK provides no cheaper way to reuse it across the sub-clients
     * (payments/subscriptions/customers/refunds) than holding one instance.
     */
    @PostConstruct
    public void init() throws RazorpayException {
        if (keyId != null && !keyId.isBlank() && keySecret != null && !keySecret.isBlank()) {
            client = new RazorpayClient(keyId, keySecret);
        } else {
            log.warn("Razorpay key-id/key-secret not configured -- RazorpayPaymentProvider calls will fail "
                    + "until app.razorpay.key-id / app.razorpay.key-secret are set.");
        }
    }
}
