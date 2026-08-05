package com.recoverpro.server.scheduler;

import com.recoverpro.server.service.MisEodReportService;
import com.recoverpro.server.service.OpsAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

@Slf4j
@Component
@RequiredArgsConstructor
public class MisEodScheduler {

    private final MisEodReportService misEodReportService;
    private final OpsAlertService opsAlertService;

    @Scheduled(cron = "${app.scheduler.mis-eod-cron:0 0 20 * * *}", zone = "Asia/Kolkata")
    @SchedulerLock(
            name = "MisEodScheduler.run",
            lockAtLeastFor = "PT1M",
            lockAtMostFor = "PT10M")
    public void run() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        log.info("MisEodScheduler: generating MIS for date={}", today);
        try {
            misEodReportService.runScheduled(today);
            log.info("MisEodScheduler: completed for date={}", today);
        } catch (Exception e) {
            log.error("MisEodScheduler: failed for date={}", today, e);
            opsAlertService.alertJobFailure("MisEodScheduler.run", "MIS generation for date=" + today, e);
        }
    }
}
