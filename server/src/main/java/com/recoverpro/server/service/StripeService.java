package com.recoverpro.server.service;

import com.recoverpro.server.config.StripeConfig;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripeService {

    private final StripeConfig stripeConfig;
    private final OrgSubscriptionRepository subRepo;

    public String createCheckoutUrl(UUID orgId, String planName) throws StripeException {
        OrgSubscription sub = subRepo.findByOrgId(orgId).orElseGet(() ->
                OrgSubscription.builder().orgId(orgId).build());

        String customerId = ensureCustomer(sub, orgId);
        String priceId = resolvePriceId(planName);

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setCustomer(customerId)
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setPrice(priceId)
                        .setQuantity(1L)
                        .build())
                .setSuccessUrl(stripeConfig.getBaseUrl() + "/app/subscription?success=true")
                .setCancelUrl(stripeConfig.getBaseUrl() + "/app/subscription?cancelled=true")
                .build();

        Session session = Session.create(params);
        log.info("Stripe checkout session created: org={}, plan={}, sessionId={}", orgId, planName, session.getId());
        return session.getUrl();
    }

    public String createPortalUrl(UUID orgId) throws StripeException {
        OrgSubscription sub = subRepo.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalStateException("No subscription found for org: " + orgId));

        if (sub.getStripeCustomerId() == null) {
            throw new IllegalStateException("No Stripe customer linked to org: " + orgId);
        }

        com.stripe.param.billingportal.SessionCreateParams params =
                com.stripe.param.billingportal.SessionCreateParams.builder()
                        .setCustomer(sub.getStripeCustomerId())
                        .setReturnUrl(stripeConfig.getBaseUrl() + "/app/subscription")
                        .build();

        com.stripe.model.billingportal.Session session =
                com.stripe.model.billingportal.Session.create(params);
        log.info("Stripe portal session created: org={}", orgId);
        return session.getUrl();
    }

    private String ensureCustomer(OrgSubscription sub, UUID orgId) throws StripeException {
        if (sub.getStripeCustomerId() != null) {
            return sub.getStripeCustomerId();
        }
        Customer customer = Customer.create(CustomerCreateParams.builder()
                .putMetadata("orgId", orgId.toString())
                .build());
        sub.setStripeCustomerId(customer.getId());
        subRepo.save(sub);
        log.info("Stripe customer created: org={}, customerId={}", orgId, customer.getId());
        return customer.getId();
    }

    private String resolvePriceId(String planName) {
        return switch (planName.toUpperCase()) {
            case "GROWTH"     -> stripeConfig.getPriceGrowth();
            case "ENTERPRISE" -> stripeConfig.getPriceEnterprise();
            default           -> stripeConfig.getPriceStarter();
        };
    }
}
