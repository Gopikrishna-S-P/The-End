package com.recoverpro.server.scheduler;

import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.service.NpaService;
import com.recoverpro.server.service.OpsAlertService;
import com.recoverpro.server.service.SnapshotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MonthlySnapshotScheduler {

    private final SnapshotService snapshotService;
    private final NpaService npaService;
    private final OrganizationRepository organizationRepository;
    private final OpsAlertService opsAlertService;

    /**
     * Runs at 02:00 on the 1st of every month.
     */
    @Scheduled(cron = "${app.scheduler.monthly-snapshot-cron:0 0 2 1 * *}")
    @SchedulerLock(name = "MonthlySnapshotScheduler.monthly", lockAtLeastFor = "PT1M", lockAtMostFor = "PT30M")
    public void captureMonthlySnapshot() {
        LocalDate lastMonth = LocalDate.now().minusMonths(1);
        int month = lastMonth.getMonthValue();
        int year  = lastMonth.getYear();
        log.info("Scheduled monthly snapshot triggered: month={}/{}", month, year);
        long t0 = System.currentTimeMillis();
        try {
            int orgsCaptured = snapshotService.captureAllOrgsMonthlySnapshot(month, year);
            log.info("Scheduled monthly snapshot complete for month={}/{} — orgsCaptured={} elapsedMs={}",
                    month, year, orgsCaptured, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            log.error("Scheduled monthly snapshot failed for month={}/{} after {}ms",
                    month, year, System.currentTimeMillis() - t0, e);
            opsAlertService.alertJobFailure("MonthlySnapshotScheduler.captureMonthlySnapshot",
                    "month=" + month + "/" + year, e);
        }
    }

    /**
     * Runs every day at 23:30 to capture daily agent performance snapshots.
     */
    @Scheduled(cron = "${app.scheduler.daily-snapshot-cron:0 30 23 * * *}")
    @SchedulerLock(name = "MonthlySnapshotScheduler.daily", lockAtLeastFor = "PT30S", lockAtMostFor = "PT15M")
    public void captureDailyAgentSnapshots() {
        LocalDate today = LocalDate.now();
        log.info("Scheduled daily agent performance snapshot triggered for date={}", today);
        long t0 = System.currentTimeMillis();
        List<Organization> activeOrgs = organizationRepository.findAll().stream()
                .filter(Organization::isActive)
                .toList();
        int successCount = 0;
        int failureCount = 0;
        for (Organization org : activeOrgs) {
            try {
                snapshotService.captureAgentPerformanceSnapshot(org.getId(), today);
                successCount++;
            } catch (Exception e) {
                log.error("Failed to capture daily agent snapshot for orgId={}: {}", org.getId(), e.getMessage());
                failureCount++;
                opsAlertService.alertJobFailure("MonthlySnapshotScheduler.captureDailyAgentSnapshots",
                        "orgId=" + org.getId() + " date=" + today, e);
            }
        }
        log.info("Scheduled daily agent performance snapshot complete for date={} — success={} failed={} elapsedMs={}",
                today, successCount, failureCount, System.currentTimeMillis() - t0);
    }

    /**
     * Runs every day at 22:00 to flag/unflag NPA records from each org's active allocations'
     * dpd_days (days-past-due), which also feeds the monthly loan-book NPA totals.
     */
    @Scheduled(cron = "${app.scheduler.npa-flagging-cron:0 0 22 * * *}")
    @SchedulerLock(name = "MonthlySnapshotScheduler.npaFlagging", lockAtLeastFor = "PT30S", lockAtMostFor = "PT15M")
    public void flagOverdueNpaRecords() {
        log.info("Scheduled NPA flagging triggered");
        long t0 = System.currentTimeMillis();
        List<Organization> activeOrgs = organizationRepository.findAll().stream()
                .filter(Organization::isActive)
                .toList();
        int totalFlagged = 0;
        for (Organization org : activeOrgs) {
            try {
                totalFlagged += npaService.flagOverdueAllocations(org.getId());
            } catch (Exception e) {
                log.error("NPA flagging failed for orgId={}: {}", org.getId(), e.getMessage());
                opsAlertService.alertJobFailure("MonthlySnapshotScheduler.flagOverdueNpaRecords",
                        "orgId=" + org.getId(), e);
            }
        }
        log.info("Scheduled NPA flagging complete: {} orgs processed, {} allocations flagged/updated, elapsedMs={}",
                activeOrgs.size(), totalFlagged, System.currentTimeMillis() - t0);
    }
}
