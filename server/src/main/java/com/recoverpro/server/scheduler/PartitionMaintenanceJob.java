package com.recoverpro.server.scheduler;

import com.recoverpro.server.service.OpsAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

/**
 * Creates the next month's audit-log partition on the 25th of each month,
 * ensuring the partition exists before the month starts.
 *
 * ShedLock prevents duplicate execution in multi-pod deployments.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PartitionMaintenanceJob {

    private final JdbcTemplate jdbcTemplate;
    private final OpsAlertService opsAlertService;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy_MM");
    private static final DateTimeFormatter DATE_FMT   = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /** Runs at 02:00 on the 25th of every month. */
    @Scheduled(cron = "0 0 2 25 * *")
    @SchedulerLock(name = "partition_maintenance", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void createNextMonthPartition() {
        YearMonth next = YearMonth.now().plusMonths(1);
        String partitionName = "user_action_audit_logs_" + next.format(MONTH_FMT);
        String fromDate = next.atDay(1).format(DATE_FMT);
        String toDate   = next.plusMonths(1).atDay(1).format(DATE_FMT);

        String sql = String.format(
                "CREATE TABLE IF NOT EXISTS %s PARTITION OF user_action_audit_logs " +
                "FOR VALUES FROM ('%s') TO ('%s')",
                partitionName, fromDate, toDate);

        try {
            jdbcTemplate.execute(sql);
            log.info("PartitionMaintenance: created partition {} ({} → {})", partitionName, fromDate, toDate);
        } catch (Exception e) {
            log.error("PartitionMaintenance: failed to create partition {}: {}", partitionName, e.getMessage());
            opsAlertService.alertJobFailure("PartitionMaintenanceJob.createNextMonthPartition",
                    "partition=" + partitionName + " (audit-log inserts will start failing once "
                            + fromDate + " arrives without this partition)", e);
            throw e;
        }
    }
}
