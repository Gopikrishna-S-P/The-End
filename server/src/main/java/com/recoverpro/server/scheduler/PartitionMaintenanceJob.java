package com.recoverpro.server.scheduler;

import com.recoverpro.server.service.OpsAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Creates upcoming monthly partitions for every RANGE-partitioned audit table on the 25th of
 * each month, several months ahead of need, so a missed job run does not immediately push rows
 * into a table's DEFAULT partition.
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

    /** Every RANGE-partitioned-by-month audit table this job is responsible for. */
    static final List<String> PARTITIONED_TABLES = List.of(
            "user_action_audit_logs",
            "unified_audit_events"
    );

    /** How many months ahead to ensure partitions exist for, so one missed run isn't fatal. */
    private static final int LOOKAHEAD_MONTHS = 3;

    /** Runs at 02:00 on the 25th of every month. */
    @Scheduled(cron = "0 0 2 25 * *")
    @SchedulerLock(name = "partition_maintenance", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void createUpcomingPartitions() {
        List<String> failures = new ArrayList<>();

        for (String table : PARTITIONED_TABLES) {
            for (int monthsAhead = 1; monthsAhead <= LOOKAHEAD_MONTHS; monthsAhead++) {
                YearMonth month = YearMonth.now().plusMonths(monthsAhead);
                try {
                    createPartition(table, month);
                } catch (Exception e) {
                    failures.add(table + "_" + month.format(MONTH_FMT));
                }
            }
        }

        if (!failures.isEmpty()) {
            throw new IllegalStateException("PartitionMaintenance: failed to create partitions: " + failures);
        }
    }

    private void createPartition(String table, YearMonth month) {
        String partitionName = table + "_" + month.format(MONTH_FMT);
        String fromDate = month.atDay(1).format(DATE_FMT);
        String toDate   = month.plusMonths(1).atDay(1).format(DATE_FMT);

        String sql = String.format(
                "CREATE TABLE IF NOT EXISTS %s PARTITION OF %s FOR VALUES FROM ('%s') TO ('%s')",
                partitionName, table, fromDate, toDate);

        try {
            jdbcTemplate.execute(sql);
            log.info("PartitionMaintenance: created partition {} ({} → {})", partitionName, fromDate, toDate);
        } catch (Exception e) {
            log.error("PartitionMaintenance: failed to create partition {}: {}", partitionName, e.getMessage());
            opsAlertService.alertJobFailure("PartitionMaintenanceJob.createUpcomingPartitions",
                    "partition=" + partitionName + " (audit-log inserts will start failing once "
                            + fromDate + " arrives without this partition)", e);
            throw e;
        }
    }
}
