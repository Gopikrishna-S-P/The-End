package com.recoverpro.server.service.impl;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.recoverpro.server.common.exception.PaymentProviderException;
import com.recoverpro.server.config.RazorpayConfig;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.enums.PaymentProviderType;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.service.PaymentProvider;
import com.recoverpro.server.service.RefundResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Field names below (plan_id, customer_notify, total_count, cancel_at_cycle_end, short_url, ...)
 * follow Razorpay's public REST API docs as of this codebase's authoring date -- the SDK itself
 * is a thin JSONObject-in/JSONObject-out wrapper with no typed request builders (unlike Stripe's
 * SessionCreateParams), so there's no compiler check on these keys. Verify against the live
 * Razorpay API reference before this provider is used against a real account.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RazorpayPaymentProvider implements PaymentProvider {

    /** Razorpay subscriptions require a total billing-cycle count up front rather than running
     *  indefinitely like Stripe. 120 monthly cycles (10 years) approximates "no end date" without
     *  actually being unbounded, which the API doesn't support. */
    private static final int TOTAL_BILLING_CYCLES = 120;

    private final RazorpayConfig config;
    private final OrgSubscriptionRepository subRepo;

    @Override
    public String createCheckoutUrl(UUID orgId, String planName) {
        RazorpayClient client = requireClient();
        OrgSubscription sub = subRepo.findByOrgId(orgId).orElseGet(() ->
                OrgSubscription.builder().orgId(orgId).provider(PaymentProviderType.RAZORPAY).build());
        sub.setProvider(PaymentProviderType.RAZORPAY);

        try {
            String customerId = ensureCustomer(client, sub, orgId);
            String planId = resolvePlanId(planName);

            JSONObject request = new JSONObject();
            request.put("plan_id", planId);
            request.put("customer_notify", 1);
            request.put("total_count", TOTAL_BILLING_CYCLES);
            request.put("quantity", 1);
            request.put("notes", new JSONObject().put("orgId", orgId.toString()));

            com.razorpay.Subscription subscription = client.subscriptions.create(request);
            String subscriptionId = subscription.get("id");
            sub.setRazorpaySubscriptionId(subscriptionId);
            subRepo.save(sub);

            log.info("Razorpay subscription created: org={}, plan={}, subscriptionId={}",
                    orgId, planName, subscriptionId);
            return subscription.get("short_url");
        } catch (RazorpayException e) {
            throw new PaymentProviderException("Razorpay checkout error: " + e.getMessage(), e);
        }
    }

    @Override
    public String createPortalUrl(UUID orgId) {
        // Razorpay has no direct equivalent to Stripe's hosted Billing Portal (Billing Ledger
        // design doc §16, open decision #1) -- surfaced as a clear, typed failure rather than a
        // silently broken/empty URL, so the caller (SubscriptionController) can show a real
        // message instead of a dead link.
        throw new PaymentProviderException(
                "Self-service billing management isn't available yet for Razorpay-billed "
                        + "organizations. Contact support to change your plan or payment method.", null);
    }

    @Override
    public void cancelSubscription(UUID orgId, boolean atPeriodEnd) {
        RazorpayClient client = requireClient();
        OrgSubscription sub = subRepo.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalStateException("No subscription found for org: " + orgId));
        if (sub.getRazorpaySubscriptionId() == null) {
            throw new IllegalStateException("No Razorpay subscription linked to org: " + orgId);
        }
        try {
            JSONObject request = new JSONObject();
            request.put("cancel_at_cycle_end", atPeriodEnd ? 1 : 0);
            client.subscriptions.cancel(sub.getRazorpaySubscriptionId(), request);
            log.info("Razorpay subscription cancel requested: org={}, atPeriodEnd={}", orgId, atPeriodEnd);
        } catch (RazorpayException e) {
            throw new PaymentProviderException("Razorpay cancellation error: " + e.getMessage(), e);
        }
    }

    @Override
    public RefundResult refundPayment(String providerPaymentRef, Long amountMinorUnits, String reason) {
        RazorpayClient client = requireClient();
        try {
            JSONObject request = new JSONObject();
            if (amountMinorUnits != null) {
                request.put("amount", amountMinorUnits);
            }
            // `reason` stays in RecoverPro's own Refund.reason column and audit trail, same
            // reasoning as StripePaymentProvider -- Razorpay's refund payload has no free-text
            // reason field, only a `notes` map, which isn't queried/reported on anywhere.
            com.razorpay.Refund refund = client.payments.refund(providerPaymentRef, request);
            String status = refund.get("status");
            log.info("Razorpay refund created: payment={}, refundId={}, status={}",
                    providerPaymentRef, refund.get("id"), status);
            return new RefundResult(refund.get("id"), "processed".equals(status), status);
        } catch (RazorpayException e) {
            throw new PaymentProviderException("Razorpay refund error: " + e.getMessage(), e);
        }
    }

    private String ensureCustomer(RazorpayClient client, OrgSubscription sub, UUID orgId) throws RazorpayException {
        if (sub.getRazorpayCustomerId() != null) {
            return sub.getRazorpayCustomerId();
        }
        JSONObject request = new JSONObject();
        request.put("name", "Org " + orgId);
        request.put("notes", new JSONObject().put("orgId", orgId.toString()));
        com.razorpay.Customer customer = client.customers.create(request);
        String customerId = customer.get("id");
        sub.setRazorpayCustomerId(customerId);
        subRepo.save(sub);
        log.info("Razorpay customer created: org={}, customerId={}", orgId, customerId);
        return customerId;
    }

    private String resolvePlanId(String planName) {
        return switch (planName.toUpperCase()) {
            case "GROWTH"     -> config.getPlanGrowth();
            case "ENTERPRISE" -> config.getPlanEnterprise();
            default           -> config.getPlanStarter();
        };
    }

    private RazorpayClient requireClient() {
        RazorpayClient client = config.getClient();
        if (client == null) {
            throw new PaymentProviderException(
                    "Razorpay is not configured (app.razorpay.key-id / app.razorpay.key-secret unset)", null);
        }
        return client;
    }
}
