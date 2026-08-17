package com.recoverpro.server.scheduler;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.service.AuditService;
import com.recoverpro.server.service.FeatureFlagService;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.OpsAlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
class DunningSchedulerTest {

    @Mock private OrgSubscriptionRepository subRepo;
    @Mock private NotificationService notificationService;
    @Mock private FeatureFlagService featureFlagService;
    @Mock private AuditService auditService;
    @Mock private OpsAlertService opsAlertService;

    private DunningScheduler scheduler;
    private AppProperties appProperties;
    private UUID orgId;
    private UUID subId;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        appProperties.getBilling().setDunningGracePeriodDays(7);
        scheduler = new DunningScheduler(
                subRepo, notificationService, featureFlagService, auditService, opsAlertService, appProperties);
        orgId = UUID.randomUUID();
        subId = UUID.randomUUID();
    }

    private OrgSubscription pastDueSince(long daysAgo) {
        return OrgSubscription.builder()
                .id(subId)
                .orgId(orgId)
                .status(OrgSubscription.Status.PAST_DUE)
                .plan(OrgSubscription.Plan.GROWTH)
                .pastDueSince(Instant.now().minus(daysAgo, ChronoUnit.DAYS))
                .build();
    }

    @Test
    void processOne_dayOne_sendsReminderAndDoesNotCancel() {
        when(subRepo.findById(subId)).thenReturn(Optional.of(pastDueSince(1)));

        scheduler.processOne(subId);

        verify(notificationService).createForOrgRole(eq(orgId), anyString(),
                eq(NotificationType.ORG_PAYMENT_FAILED), anyString(), anyString());
        verify(subRepo, never()).save(any());
        verify(featureFlagService, never()).provisionFlagsFor(any());
    }

    @Test
    void processOne_dayFour_sendsReminder() {
        when(subRepo.findById(subId)).thenReturn(Optional.of(pastDueSince(4)));

        scheduler.processOne(subId);

        verify(notificationService).createForOrgRole(eq(orgId), anyString(),
                eq(NotificationType.ORG_PAYMENT_FAILED), anyString(), anyString());
    }

    @Test
    void processOne_dayTwo_notAReminderDay_noOp() {
        when(subRepo.findById(subId)).thenReturn(Optional.of(pastDueSince(2)));

        scheduler.processOne(subId);

        verify(notificationService, never()).createForOrgRole(any(), anyString(), any(), anyString(), anyString());
        verify(subRepo, never()).save(any());
    }

    @Test
    void processOne_gracePeriodExpired_cancelsAndRevokesEntitlementsAndAudits() {
        OrgSubscription sub = pastDueSince(7);
        when(subRepo.findById(subId)).thenReturn(Optional.of(sub));

        scheduler.processOne(subId);

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.CANCELLED);
        assertThat(sub.getPastDueSince()).isNull();
        verify(subRepo).save(sub);
        verify(featureFlagService).provisionFlagsFor(sub);
        verify(notificationService).createForOrgRole(eq(orgId), anyString(),
                eq(NotificationType.ORG_SUBSCRIPTION_CANCELLED), anyString(), anyString());
        verify(auditService).record(any());
    }

    @Test
    void processOne_alreadyRecoveredSinceSweepListBuilt_isNoOp() {
        OrgSubscription recovered = OrgSubscription.builder()
                .id(subId).orgId(orgId).status(OrgSubscription.Status.ACTIVE)
                .plan(OrgSubscription.Plan.GROWTH).pastDueSince(null).build();
        when(subRepo.findById(subId)).thenReturn(Optional.of(recovered));

        scheduler.processOne(subId);

        verify(notificationService, never()).createForOrgRole(any(), anyString(), any(), anyString(), anyString());
        verify(subRepo, never()).save(any());
    }
}
