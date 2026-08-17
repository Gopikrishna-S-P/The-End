package com.recoverpro.server.service;

import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.Payment;
import com.recoverpro.server.entity.ProcessedRazorpayEvent;
import com.recoverpro.server.enums.AuditAction;
import com.recoverpro.server.enums.AuditActorType;
import com.recoverpro.server.enums.AuditResourceType;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.enums.PaymentProviderType;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.PaymentRepository;
import com.recoverpro.server.repository.ProcessedRazorpayEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * Syncs {@link OrgSubscription} state from Razorpay subscription-billing webhook events. Mirrors
 * {@code StripeWebhookService}'s structure (claim/dispatch/audit/notify), scoped narrower: it
 * updates subscription status only. It does NOT mirror Razorpay invoices into
 * {@code PlatformInvoice} -- that table's schema (stripe_invoice_id, stripe_customer_id, ...) is
 * Stripe-shaped, and unifying invoice mirroring across both providers is a real, separate schema
 * decision (a provider-agnostic invoice table or generalized columns), not something to guess at
 * here. Flagged as a follow-up, not done.
 * <p>
 * Event-name-to-status mapping below (subscription.charged/pending/halted/cancelled) follows
 * Razorpay's public Subscriptions webhook documentation as of this codebase's authoring date --
 * verify against a live webhook payload capture before this handler processes real events, same
 * caveat as {@link com.recoverpro.server.service.impl.RazorpayPaymentProvider}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RazorpayWebhookService {

    private final ProcessedRazorpayEventRepository processedEventRepository;
    private final OrgSubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final FeatureFlagService featureFlagService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    /** Same reasoning as {@code StripeWebhookService.claimEvent}: flush-immediately insert so the
     *  duplicate-key violation surfaces inline, not at the caller's transaction commit. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimEvent(String eventId, String eventType) {
        try {
            processedEventRepository.saveAndFlush(ProcessedRazorpayEvent.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .processedAt(Instant.now())
                    .build());
            return true;
        } catch (DataIntegrityViolationException e) {
            log.info("Razorpay event {} already processed (type={}), skipping", eventId, eventType);
            return false;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void releaseEventClaim(String eventId) {
        processedEventRepository.deleteById(eventId);
    }

    /**
     * Dispatches by the webhook envelope's {@code event} field. {@code payload} is the raw
     * {@code payload.subscription.entity} / {@code payload.payment.entity} JSON object per
     * Razorpay's envelope shape ({@code {"event": ..., "payload": {"subscription": {"entity":
     * {...}}}}}) -- extraction of the right sub-object happens in the controller, not here, so
     * this method only ever sees one entity's fields.
     */
    @Transactional
    public void handleSubscriptionEvent(String eventType, JSONObject subscriptionEntity) {
        handleSubscriptionEvent(eventType, subscriptionEntity, null);
    }

    @Transactional
    public void handleSubscriptionEvent(String eventType, JSONObject subscriptionEntity, JSONObject paymentEntity) {
        String razorpaySubscriptionId = subscriptionEntity.optString("id", null);
        if (razorpaySubscriptionId == null) {
            log.warn("Razorpay {} event carried no subscription id, skipping", eventType);
            return;
        }
        Optional<OrgSubscription> maybeSub =
                subscriptionRepository.findByRazorpaySubscriptionId(razorpaySubscriptionId);
        if (maybeSub.isEmpty()) {
            log.warn("Razorpay subscription {} not linked to any org, event {} dropped",
                    razorpaySubscriptionId, eventType);
            return;
        }
        OrgSubscription sub = maybeSub.get();

        switch (eventType) {
            case "subscription.activated", "subscription.charged" -> handleRecovered(sub);
            case "subscription.pending" -> handlePastDue(sub, "Razorpay retry in progress");
            case "subscription.halted" -> handlePastDue(sub, "Razorpay retries exhausted");
            case "subscription.cancelled" -> handleCancelled(sub);
            default -> log.debug("Unhandled Razorpay subscription event type: {}", eventType);
        }

        if (paymentEntity != null) {
            mirrorPayment(sub, paymentEntity);
        }
    }

    /**
     * Mirrors a {@link Payment} row from {@code payload.payment.entity} (Billing Ledger design
     * doc §24), keyed on the payment's own id so repeat deliveries for the same payment (e.g. a
     * webhook retry) upsert in place. There is no local {@code PlatformInvoice} equivalent on the
     * Razorpay side to link {@code invoiceId} against ({@link RazorpayWebhookService}'s class
     * javadoc already flags Razorpay invoice mirroring as a separate, un-started gap), so
     * {@code invoiceId} is left null here.
     * <p>
     * Field names ({@code amount}, {@code currency}, {@code status}, {@code method},
     * {@code error_description}) follow Razorpay's public Payments API docs as of this codebase's
     * authoring date -- same unverified-against-a-live-payload caveat as the rest of this class
     * and {@link com.recoverpro.server.service.impl.RazorpayPaymentProvider}.
     */
    private void mirrorPayment(OrgSubscription sub, JSONObject paymentEntity) {
        String providerPaymentId = paymentEntity.optString("id", null);
        if (providerPaymentId == null) {
            return;
        }
        Payment payment = paymentRepository
                .findByProviderAndProviderPaymentId(PaymentProviderType.RAZORPAY, providerPaymentId)
                .orElseGet(() -> Payment.builder()
                        .provider(PaymentProviderType.RAZORPAY)
                        .providerPaymentId(providerPaymentId)
                        .build());
        String status = paymentEntity.optString("status", "unknown");
        payment.setOrganizationId(sub.getOrgId());
        payment.setAmountMinorUnits(paymentEntity.optLong("amount", 0L));
        payment.setCurrency(paymentEntity.optString("currency", "INR"));
        payment.setStatus(status);
        payment.setPaymentMethodType(paymentEntity.isNull("method") ? null : paymentEntity.optString("method", null));
        if ("captured".equals(status) && payment.getCapturedAt() == null) {
            payment.setCapturedAt(Instant.now());
        }
        if ("failed".equals(status) && payment.getFailedAt() == null) {
            payment.setFailedAt(Instant.now());
            payment.setFailureReason(paymentEntity.isNull("error_description")
                    ? null : paymentEntity.optString("error_description", null));
        }
        paymentRepository.save(payment);
        log.info("Razorpay payment mirrored: org={}, payment={}, status={}",
                sub.getOrgId(), providerPaymentId, status);
    }

    private void handleRecovered(OrgSubscription sub) {
        boolean wasPastDue = sub.getStatus() == OrgSubscription.Status.PAST_DUE;
        sub.setStatus(OrgSubscription.Status.ACTIVE);
        sub.setPastDueSince(null);
        subscriptionRepository.save(sub);
        featureFlagService.provisionFlagsFor(sub);
        log.info("Razorpay subscription active: org={}", sub.getOrgId());
        if (wasPastDue) {
            notificationService.createForOrgRole(sub.getOrgId(), PlatformConstants.ROLE_ORG_ADMIN,
                    NotificationType.ORG_PAYMENT_RECOVERED,
                    "Payment received", "Your subscription is active again -- thanks for settling up.");
        }
    }

    private void handlePastDue(OrgSubscription sub, String reason) {
        boolean enteringPastDue = sub.getStatus() != OrgSubscription.Status.PAST_DUE;
        if (enteringPastDue) {
            sub.setPastDueSince(Instant.now());
        }
        sub.setStatus(OrgSubscription.Status.PAST_DUE);
        subscriptionRepository.save(sub);
        featureFlagService.provisionFlagsFor(sub);
        log.warn("Razorpay subscription past due: org={}, reason={}", sub.getOrgId(), reason);
        if (enteringPastDue) {
            notificationService.createForOrgRole(sub.getOrgId(), PlatformConstants.ROLE_ORG_ADMIN,
                    NotificationType.ORG_PAYMENT_FAILED,
                    "Payment failed",
                    "We couldn't process your latest payment. We'll retry automatically -- "
                            + "please update your payment method to avoid any service interruption.");
        }
        auditService.record(AuditEventRequest.builder()
                .action(AuditAction.INVOICE_PAYMENT_FAILED)
                .resourceType(AuditResourceType.SUBSCRIPTION)
                .resourceId(sub.getOrgId().toString())
                .reason(reason)
                .actorTypeOverride(AuditActorType.SYSTEM)
                .organizationIdOverride(sub.getOrgId())
                .metadata(Map.of("razorpaySubscriptionId", String.valueOf(sub.getRazorpaySubscriptionId())))
                .build());
    }

    private void handleCancelled(OrgSubscription sub) {
        sub.setStatus(OrgSubscription.Status.CANCELLED);
        sub.setPastDueSince(null);
        subscriptionRepository.save(sub);
        featureFlagService.provisionFlagsFor(sub);
        log.info("Razorpay subscription cancelled: org={}", sub.getOrgId());
        auditService.record(AuditEventRequest.builder()
                .action(AuditAction.SUBSCRIPTION_CANCELLED)
                .resourceType(AuditResourceType.SUBSCRIPTION)
                .resourceId(sub.getOrgId().toString())
                .actorTypeOverride(AuditActorType.SYSTEM)
                .organizationIdOverride(sub.getOrgId())
                .build());
    }
}
