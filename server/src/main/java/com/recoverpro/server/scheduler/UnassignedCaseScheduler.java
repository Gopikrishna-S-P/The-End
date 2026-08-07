package com.recoverpro.server.scheduler;

import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.OrganizationRepository;
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

/** Flags cases that have sat UNASSIGNED too long -- nobody was ever notified about these before. */
@Slf4j
@Component
@RequiredArgsConstructor
public class UnassignedCaseScheduler {

    private final OrganizationRepository organizationRepository;
    private final AllocationRepository allocationRepository;
    private final NotificationService notificationService;
    private final OpsAlertService opsAlertService;

    @Value("${app.scheduler.unassigned-case-age-days:3}")
    private int staleAfterDays;

    @Scheduled(cron = "${app.scheduler.unassigned-case-cron:0 15 9 * * *}", zone = "Asia/Kolkata")
    @SchedulerLock(name = "UnassignedCaseScheduler.flagStaleUnassignedCases", lockAtLeastFor = "PT30S", lockAtMostFor = "PT10M")
    public void flagStaleUnassignedCases() {
        log.info("UnassignedCaseScheduler: starting sweep");
        long t0 = System.currentTimeMillis();
        try {
            Instant cutoff = Instant.now().minus(staleAfterDays, ChronoUnit.DAYS);
            int orgsFlagged = 0;
            for (Organization org : organizationRepository.findTenantOrgs()) {
                long staleCount = allocationRepository.countByOrgIdAndStatusAndCreatedAtBefore(
                        org.getId(), AllocationStatus.UNASSIGNED, cutoff);
                if (staleCount == 0) continue;
                orgsFlagged++;
                notificationService.createForOrgRole(org.getId(), PlatformConstants.ROLE_TL,
                        NotificationType.TL_CASES_UNASSIGNED,
                        staleCount + " cases unassigned for over " + staleAfterDays + " days",
                        staleCount + " allocations in your organization have been sitting unassigned since before "
                                + cutoff + ". Please assign them to field officers.");
            }
            log.info("UnassignedCaseScheduler: sweep complete — orgsFlagged={} elapsedMs={}",
                    orgsFlagged, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            log.error("UnassignedCaseScheduler: sweep failed after {}ms", System.currentTimeMillis() - t0, e);
            opsAlertService.alertJobFailure("UnassignedCaseScheduler.flagStaleUnassignedCases",
                    "stale unassigned-case sweep", e);
        }
    }
}
