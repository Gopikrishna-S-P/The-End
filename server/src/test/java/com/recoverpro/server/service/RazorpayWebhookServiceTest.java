package com.recoverpro.server.service;

import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.ProcessedRazorpayEventRepository;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RazorpayWebhookServiceTest {

    @Mock private ProcessedRazorpayEventRepository processedEventRepository;
    @Mock private OrgSubscriptionRepository subscriptionRepository;
    @Mock private FeatureFlagService featureFlagService;
    @Mock private AuditService auditService;
    @Mock private NotificationService notificationService;

    private RazorpayWebhookService service;
    private UUID orgId;

    @BeforeEach
    void setUp() {
        service = new RazorpayWebhookService(
                processedEventRepository, subscriptionRepository, featureFlagService, auditService, notificationService);
        orgId = UUID.randomUUID();
    }

    private OrgSubscription subWith(OrgSubscription.Status status) {
        return OrgSubscription.builder()
                .orgId(orgId)
                .razorpaySubscriptionId("sub_xyz")
                .status(status)
                .plan(OrgSubscription.Plan.GROWTH)
                .build();
    }

    private JSONObject subscriptionEntity() {
        return new JSONObject().put("id", "sub_xyz");
    }

    @Test
    void handleSubscriptionEvent_charged_marksActiveAndNotifiesRecoveryIfWasPastDue() {
        OrgSubscription sub = subWith(OrgSubscription.Status.PAST_DUE);
        when(subscriptionRepository.findByRazorpaySubscriptionId("sub_xyz")).thenReturn(Optional.of(sub));

        service.handleSubscriptionEvent("subscription.charged", subscriptionEntity());

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.ACTIVE);
        assertThat(sub.getPastDueSince()).isNull();
        verify(featureFlagService).provisionFlagsFor(sub);
        verify(notificationService).createForOrgRole(eq(orgId), anyString(),
                eq(NotificationType.ORG_PAYMENT_RECOVERED), anyString(), anyString());
    }

    @Test
    void handleSubscriptionEvent_charged_alreadyActive_doesNotSpamRecoveryNotification() {
        OrgSubscription sub = subWith(OrgSubscription.Status.ACTIVE);
        when(subscriptionRepository.findByRazorpaySubscriptionId("sub_xyz")).thenReturn(Optional.of(sub));

        service.handleSubscriptionEvent("subscription.charged", subscriptionEntity());

        verify(notificationService, never()).createForOrgRole(any(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void handleSubscriptionEvent_pending_marksPastDueAndStampsClockOnce() {
        OrgSubscription sub = subWith(OrgSubscription.Status.ACTIVE);
        when(subscriptionRepository.findByRazorpaySubscriptionId("sub_xyz")).thenReturn(Optional.of(sub));

        service.handleSubscriptionEvent("subscription.pending", subscriptionEntity());

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.PAST_DUE);
        assertThat(sub.getPastDueSince()).isNotNull();
        verify(notificationService).createForOrgRole(eq(orgId), anyString(),
                eq(NotificationType.ORG_PAYMENT_FAILED), anyString(), anyString());
        verify(auditService).record(any());
    }

    @Test
    void handleSubscriptionEvent_halted_marksPastDueWithoutResettingExistingClock() {
        OrgSubscription sub = subWith(OrgSubscription.Status.PAST_DUE);
        java.time.Instant firstFailure = java.time.Instant.now().minusSeconds(86_400 * 3);
        sub.setPastDueSince(firstFailure);
        when(subscriptionRepository.findByRazorpaySubscriptionId("sub_xyz")).thenReturn(Optional.of(sub));

        service.handleSubscriptionEvent("subscription.halted", subscriptionEntity());

        assertThat(sub.getPastDueSince()).isEqualTo(firstFailure);
        verify(notificationService, never()).createForOrgRole(any(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void handleSubscriptionEvent_cancelled_marksCancelledAndAudits() {
        OrgSubscription sub = subWith(OrgSubscription.Status.PAST_DUE);
        when(subscriptionRepository.findByRazorpaySubscriptionId("sub_xyz")).thenReturn(Optional.of(sub));

        service.handleSubscriptionEvent("subscription.cancelled", subscriptionEntity());

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.CANCELLED);
        assertThat(sub.getPastDueSince()).isNull();
        verify(featureFlagService).provisionFlagsFor(sub);
        verify(auditService).record(any());
    }

    @Test
    void handleSubscriptionEvent_unknownSubscriptionId_isNoOp() {
        when(subscriptionRepository.findByRazorpaySubscriptionId("sub_unknown")).thenReturn(Optional.empty());

        service.handleSubscriptionEvent("subscription.charged", new JSONObject().put("id", "sub_unknown"));

        verify(subscriptionRepository, never()).save(any());
        verify(featureFlagService, never()).provisionFlagsFor(any());
    }

    @Test
    void handleSubscriptionEvent_missingSubscriptionId_isNoOp() {
        service.handleSubscriptionEvent("subscription.charged", new JSONObject());

        verify(subscriptionRepository, never()).findByRazorpaySubscriptionId(any());
    }
}
