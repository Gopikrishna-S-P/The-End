package com.recoverpro.server.scheduler;

import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.ApprovalStatus;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.OpsAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** Flags visit logs that have sat PENDING approval too long -- nobody was ever notified about these before. */
@Slf4j
@Component
@RequiredArgsConstructor
public class VisitApprovalScheduler {

    private final OrganizationRepository organizationRepository;
    private final VisitLogRepository visitLogRepository;
    private final NotificationService notificationService;
    private final OpsAlertService opsAlertService;

    @Value("${app.scheduler.approval-overdue-age-hours:24}")
    private int staleAfterHours;

    @Scheduled(cron = "${app.scheduler.approval-overdue-cron:0 30 9 * * *}", zone = "Asia/Kolkata")
    @SchedulerLock(name = "VisitApprovalScheduler.flagOverdueApprovals", lockAtLeastFor = "PT30S", lockAtMostFor = "PT10M")
    public void flagOverdueApprovals() {
        log.info("VisitApprovalScheduler: starting sweep");
        long t0 = System.currentTimeMillis();
        try {
            Instant cutoff = Instant.now().minus(staleAfterHours, ChronoUnit.HOURS);
            int orgsFlagged = 0;
            for (Organization org : organizationRepository.findTenantOrgs()) {
                long overdueCount = visitLogRepository
                        .countByOrganizationIdAndApprovalStatusAndCreatedAtBeforeAndIsDeletedFalse(
                                org.getId(), ApprovalStatus.PENDING, cutoff);
                if (overdueCount == 0) continue;
                orgsFlagged++;
                notificationService.createForOrgRole(org.getId(), PlatformConstants.ROLE_ORG_ADMIN,
                        NotificationType.ORG_APPROVAL_PENDING_OVERDUE,
                        overdueCount + " visit approvals overdue",
                        overdueCount + " visit logs in your organization have been pending approval for over "
                                + staleAfterHours + " hours.");
            }
            log.info("VisitApprovalScheduler: sweep complete — orgsFlagged={} elapsedMs={}",
                    orgsFlagged, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            log.error("VisitApprovalScheduler: sweep failed after {}ms", System.currentTimeMillis() - t0, e);
            opsAlertService.alertJobFailure("VisitApprovalScheduler.flagOverdueApprovals",
                    "overdue visit-approval sweep", e);
        }
    }
}
