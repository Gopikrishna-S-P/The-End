package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.config.StripeConfig;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.ProcessedStripeEvent;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.ProcessedStripeEventRepository;
import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Syncs {@link OrgSubscription} state from Stripe subscription-billing webhook events.
 * Unrelated to loan-repayment collections -- Stripe is used only for this platform's
 * own SaaS billing to organizations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StripeWebhookService {

    private final ProcessedStripeEventRepository processedEventRepository;
    private final OrgSubscriptionRepository subscriptionRepository;
    private final FeatureFlagService featureFlagService;
    private final StripeConfig stripeConfig;

    /**
     * Atomically claims an event id so it is processed exactly once under Stripe's
     * at-least-once retry semantics. Flushes immediately so the duplicate-key
     * violation surfaces inside this method, not at the caller's transaction commit.
     *
     * @return true if this call claimed the event (caller should process it),
     *         false if it was already processed (caller should skip).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimEvent(String eventId, String eventType) {
        try {
            processedEventRepository.saveAndFlush(ProcessedStripeEvent.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .processedAt(Instant.now())
                    .build());
            return true;
        } catch (DataIntegrityViolationException e) {
            log.info("Stripe event {} already processed (type={}), skipping", eventId, eventType);
            return false;
        }
    }

    @Transactional
    public void handleCheckoutCompleted(Session session) {
        OrgSubscription sub = requireByCustomerId(session.getCustomer());
        sub.setStripeSubscriptionId(session.getSubscription());
        sub.setStatus(OrgSubscription.Status.ACTIVE);
        subscriptionRepository.save(sub);
        log.info("Stripe checkout completed: org={}, subscription={}", sub.getOrgId(), session.getSubscription());
    }

    /** {@code customer.subscription.created} and {@code .updated} carry the same
     * authoritative snapshot, so both are synced identically. */
    @Transactional
    public void handleSubscriptionUpserted(Subscription subscription) {
        OrgSubscription sub = requireByCustomerId(subscription.getCustomer());
        sub.setStripeSubscriptionId(subscription.getId());
        sub.setStatus(mapStatus(subscription.getStatus()));
        sub.setPlan(resolvePlan(subscription));
        sub.setPlanAmount(resolvePlanAmount(subscription));
        sub.setCurrentPeriodEnd(toInstant(subscription.getCurrentPeriodEnd()));
        sub.setCancelAtPeriodEnd(Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd()));
        subscriptionRepository.save(sub);
        featureFlagService.provisionFlagsForPlan(sub.getOrgId(), sub.getStatus(), sub.getPlan());
        log.info("Stripe subscription synced: org={}, status={}, plan={}",
                sub.getOrgId(), sub.getStatus(), sub.getPlan());
    }

    @Transactional
    public void handleSubscriptionDeleted(Subscription subscription) {
        OrgSubscription sub = requireByCustomerId(subscription.getCustomer());
        sub.setStatus(OrgSubscription.Status.CANCELLED);
        subscriptionRepository.save(sub);
        featureFlagService.provisionFlagsForPlan(sub.getOrgId(), sub.getStatus(), sub.getPlan());
        log.info("Stripe subscription cancelled: org={}", sub.getOrgId());
    }

    @Transactional
    public void handleInvoicePaid(Invoice invoice) {
        subscriptionRepository.findByStripeCustomerId(invoice.getCustomer()).ifPresent(sub -> {
            if (sub.getStatus() == OrgSubscription.Status.PAST_DUE) {
                sub.setStatus(OrgSubscription.Status.ACTIVE);
                subscriptionRepository.save(sub);
                featureFlagService.provisionFlagsForPlan(sub.getOrgId(), sub.getStatus(), sub.getPlan());
                log.info("Stripe subscription recovered from PAST_DUE: org={}", sub.getOrgId());
            }
        });
    }

    @Transactional
    public void handleInvoicePaymentFailed(Invoice invoice) {
        subscriptionRepository.findByStripeCustomerId(invoice.getCustomer()).ifPresent(sub -> {
            sub.setStatus(OrgSubscription.Status.PAST_DUE);
            subscriptionRepository.save(sub);
            featureFlagService.provisionFlagsForPlan(sub.getOrgId(), sub.getStatus(), sub.getPlan());
            log.warn("Stripe invoice payment failed, org marked PAST_DUE: org={}", sub.getOrgId());
        });
    }

    private OrgSubscription requireByCustomerId(String stripeCustomerId) {
        return subscriptionRepository.findByStripeCustomerId(stripeCustomerId)
                .orElseThrow(() -> new BusinessException(
                        "No OrgSubscription found for Stripe customer " + stripeCustomerId));
    }

    private OrgSubscription.Plan resolvePlan(Subscription subscription) {
        if (subscription.getItems() == null || subscription.getItems().getData().isEmpty()) {
            return OrgSubscription.Plan.NONE;
        }
        String priceId = subscription.getItems().getData().get(0).getPrice().getId();
        if (priceId.equals(stripeConfig.getPriceGrowth())) return OrgSubscription.Plan.GROWTH;
        if (priceId.equals(stripeConfig.getPriceEnterprise())) return OrgSubscription.Plan.ENTERPRISE;
        if (priceId.equals(stripeConfig.getPriceStarter())) return OrgSubscription.Plan.STARTER;
        log.warn("Unrecognized Stripe price id {}, defaulting to STARTER", priceId);
        return OrgSubscription.Plan.STARTER;
    }

    /** Stripe's {@code unit_amount} is in the smallest currency unit (paise for INR). */
    private static BigDecimal resolvePlanAmount(Subscription subscription) {
        if (subscription.getItems() == null || subscription.getItems().getData().isEmpty()) {
            return null;
        }
        Long unitAmount = subscription.getItems().getData().get(0).getPrice().getUnitAmount();
        return unitAmount == null ? null : BigDecimal.valueOf(unitAmount, 2);
    }

    private static OrgSubscription.Status mapStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "trialing" -> OrgSubscription.Status.TRIAL;
            case "active" -> OrgSubscription.Status.ACTIVE;
            case "past_due", "unpaid", "incomplete" -> OrgSubscription.Status.PAST_DUE;
            case "canceled", "incomplete_expired", "paused" -> OrgSubscription.Status.CANCELLED;
            default -> OrgSubscription.Status.INACTIVE;
        };
    }

    private static Instant toInstant(Long epochSeconds) {
        return epochSeconds == null ? null : Instant.ofEpochSecond(epochSeconds);
    }
}
