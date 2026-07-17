package com.recoverpro.server.scheduler;

import com.recoverpro.server.service.ReconciliationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Hourly reconciliation sweep (design-doc §5.5).
 *
 * Bank statement / sponsor-bank MIS / PG settlement file ingestion is a
 * vendor-specific source pull (SFTP / API) and lives behind the
 * {@code POST /api/v1/reconciliation/ingest} endpoint that operators or
 * a vendor adapter calls. This scheduler does the *match retry* half:
 * walks recent UNMATCHED rows and re-applies match logic so a
 * payment-transaction that arrived after ingest gets paired up
 * automatically rather than waiting for a manual rerun.
 *
 * Cron is configurable so deployments can choose business-hour-only
 * cadence vs. 24/7. Default runs every hour at minute 5 to stay clear
 * of any hourly outbound jobs that fire on the hour.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReconciliationScheduler {

    private final ReconciliationService reconciliationService;

    @Scheduled(cron = "${app.scheduler.reconciliation-cron:0 5 * * * *}", zone = "Asia/Kolkata")
    @SchedulerLock(
            name = "ReconciliationScheduler.sweep",
            lockAtLeastFor = "PT30S",
            lockAtMostFor = "PT15M")
    public void sweep() {
        log.info("ReconciliationScheduler: starting unmatched retry sweep");
        try {
            int flipped = reconciliationService.retryUnmatched();
            if (flipped > 0) {
                log.info("ReconciliationScheduler: matched {} previously-unmatched rows", flipped);
            } else {
                log.debug("ReconciliationScheduler: no matches this cycle");
            }
        } catch (Exception e) {
            log.error("ReconciliationScheduler: sweep failed", e);
        }
    }
}
