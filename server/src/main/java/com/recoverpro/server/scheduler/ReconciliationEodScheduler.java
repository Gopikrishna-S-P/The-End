package com.recoverpro.server.scheduler;

import com.recoverpro.server.service.OpsAlertService;
import com.recoverpro.server.service.ReconciliationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * End-of-day reconciliation file emitter (design-doc §5.5). Once per
 * business day, materialises today's reconciliation runs into a CSV
 * under {@code app.storage.reports-path/reconciliation/}.
 *
 * Default cron: 23:50 IST -- comfortably after the daily snapshot at
 * 23:30 and before midnight.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReconciliationEodScheduler {

    private final ReconciliationService reconciliationService;
    private final OpsAlertService opsAlertService;

    @Value("${app.storage.reports-path:./reports}")
    private String reportRoot;

    @Scheduled(cron = "${app.scheduler.reconciliation-eod-cron:0 50 23 * * *}",
            zone = "Asia/Kolkata")
    @SchedulerLock(
            name = "ReconciliationEodScheduler.run",
            lockAtLeastFor = "PT30S",
            lockAtMostFor = "PT15M")
    public void run() {
        log.info("ReconciliationEodScheduler: starting EOD report emission");
        try {
            String path = reconciliationService.emitEndOfDayReport(Instant.now(), reportRoot);
            if (path == null) {
                log.info("ReconciliationEodScheduler: no runs today, no file written");
            } else {
                log.info("ReconciliationEodScheduler: wrote {}", path);
            }
        } catch (Exception e) {
            log.error("ReconciliationEodScheduler: emission failed", e);
            opsAlertService.alertJobFailure("ReconciliationEodScheduler.run", "EOD reconciliation report emission", e);
        }
    }
}
