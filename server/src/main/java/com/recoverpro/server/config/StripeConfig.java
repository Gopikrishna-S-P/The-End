package com.recoverpro.server.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Getter
@Configuration
public class StripeConfig {

    @Value("${app.stripe.secret-key:}")
    private String secretKey;

    @Value("${app.stripe.publishable-key:}")
    private String publishableKey;

    @Value("${app.stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${app.stripe.trial-days:14}")
    private int trialDays;

    @Value("${app.stripe.price.starter:}")
    private String priceStarter;

    @Value("${app.stripe.price.growth:}")
    private String priceGrowth;

    @Value("${app.stripe.price.enterprise:}")
    private String priceEnterprise;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    @PostConstruct
    public void init() {
        if (secretKey != null && !secretKey.isBlank()) {
            Stripe.apiKey = secretKey;
        }
    }
}
