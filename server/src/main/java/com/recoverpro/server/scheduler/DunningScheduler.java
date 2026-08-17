package com.recoverpro.server.scheduler;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.enums.AuditAction;
import com.recoverpro.server.enums.AuditActorType;
import com.recoverpro.server.enums.AuditResourceType;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.service.AuditEventRequest;
import com.recoverpro.server.service.AuditService;
import com.recoverpro.server.service.FeatureFlagService;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.OpsAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Daily dunning sweep (Billing Ledger design doc §12/§13). Payment <em>retry</em> itself is
 * delegated to Stripe/Razorpay's own retry schedule -- this job only reacts to how long a
 * subscription has sat PAST_DUE: reminds at day 1 and day 4, auto-cancels once the grace period
 * (default 7 days, {@code app.billing.dunning.grace-period-days}) expires. Product access during
 * the grace period is unaffected by this job -- {@code SubscriptionController} already treats
 * PAST_DUE as active access; this job only owns the deadline and the notifications.
 * <p>
 * Each org is processed in its own REQUIRES_NEW transaction so one org's failure can't roll back
 * or block the rest of the sweep.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DunningScheduler {

    private static final Set<Integer> REMINDER_DAYS = Set.of(1, 4);

    private final OrgSubscriptionRepository subRepo;
    private final NotificationService notificationService;
    private final FeatureFlagService featureFlagService;
    private final AuditService auditService;
    private final OpsAlertService opsAlertService;
    private final AppProperties appProperties;

    @Scheduled(cron = "${app.scheduler.dunning-cron:0 0 9 * * *}", zone = "Asia/Kolkata")
    @SchedulerLock(name = "DunningScheduler.run", lockAtLeastFor = "PT30S", lockAtMostFor = "PT15M")
    public void run() {
        log.info("DunningScheduler: starting sweep");
        try {
            List<UUID> pastDueIds = subRepo.findByStatus(OrgSubscription.Status.PAST_DUE)
                    .stream().map(OrgSubscription::getId).toList();
            int reminders = 0;
            int cancellations = 0;
            for (UUID subId : pastDueIds) {
                try {
                    Outcome outcome = processOne(subId);
                    if (outcome == Outcome.REMINDED) reminders++;
                    if (outcome == Outcome.CANCELLED) cancellations++;
                } catch (Exception e) {
                    log.error("DunningScheduler: failed processing subscription {}", subId, e);
                    opsAlertService.alertJobFailure("DunningScheduler.run",
                            "subscriptionId=" + subId, e);
                }
            }
            log.info("DunningScheduler: swept {} PAST_DUE orgs, {} reminders, {} cancellations",
                    pastDueIds.size(), reminders, cancellations);
        } catch (Exception e) {
            log.error("DunningScheduler: sweep failed", e);
            opsAlertService.alertJobFailure("DunningScheduler.run", "sweep listing", e);
        }
    }

    private enum Outcome { NONE, REMINDED, CANCELLED }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Outcome processOne(UUID subId) {
        OrgSubscription sub = subRepo.findById(subId).orElse(null);
        // Re-check status/pastDueSince fresh: the org may have recovered or been comped since the
        // sweep list was built moments earlier.
        if (sub == null || sub.getStatus() != OrgSubscription.Status.PAST_DUE || sub.getPastDueSince() == null) {
            return Outcome.NONE;
        }

        int gracePeriodDays = appProperties.getBilling().getDunningGracePeriodDays();
        long daysPastDue = Duration.between(sub.getPastDueSince(), Instant.now()).toDays();

        if (daysPastDue >= gracePeriodDays) {
            expireSubscription(sub);
            return Outcome.CANCELLED;
        }
        if (REMINDER_DAYS.contains((int) daysPastDue)) {
            sendReminder(sub, daysPastDue, gracePeriodDays);
            return Outcome.REMINDED;
        }
        return Outcome.NONE;
    }

    private void sendReminder(OrgSubscription sub, long daysPastDue, int gracePeriodDays) {
        long daysLeft = gracePeriodDays - daysPastDue;
        notificationService.createForOrgRole(sub.getOrgId(), PlatformConstants.ROLE_ORG_ADMIN,
                NotificationType.ORG_PAYMENT_FAILED,
                "Payment still pending",
                "Your subscription payment is still unresolved. Please update your payment method -- "
                        + "access will be suspended in " + daysLeft + " day" + (daysLeft == 1 ? "" : "s")
                        + " if this isn't fixed.");
        log.info("DunningScheduler: sent day-{} reminder for org {}", daysPastDue, sub.getOrgId());
    }

    private void expireSubscription(OrgSubscription sub) {
        sub.setStatus(OrgSubscription.Status.CANCELLED);
        sub.setPastDueSince(null);
        subRepo.save(sub);
        featureFlagService.provisionFlagsFor(sub);

        notificationService.createForOrgRole(sub.getOrgId(), PlatformConstants.ROLE_ORG_ADMIN,
                NotificationType.ORG_SUBSCRIPTION_CANCELLED,
                "Subscription cancelled",
                "Your subscription has been cancelled after payment could not be recovered within "
                        + "the grace period. Contact support or resubscribe to restore access.");

        auditService.record(AuditEventRequest.builder()
                .action(AuditAction.SUBSCRIPTION_CANCELLED)
                .resourceType(AuditResourceType.SUBSCRIPTION)
                .resourceId(sub.getOrgId().toString())
                .reason("Dunning grace period expired")
                .actorTypeOverride(AuditActorType.BACKGROUND_JOB)
                .organizationIdOverride(sub.getOrgId())
                .metadata(Map.of("trigger", "dunning_grace_period_expired"))
                .build());

        log.warn("DunningScheduler: cancelled subscription for org {} (grace period expired)", sub.getOrgId());
    }
}
