package com.recoverpro.server.scheduler;

import com.recoverpro.server.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TASK 10.2: proves PartitionMaintenanceJob creates upcoming partitions for BOTH RANGE-partitioned
 * audit tables (not just user_action_audit_logs, the pre-existing gap), by running the real job
 * against the real dev database and checking the partitions exist via {@code to_regclass}.
 * <p>
 * unified_audit_events already has explicit partitions through 2026-12 (V085) -- for those months
 * this job's {@code CREATE TABLE IF NOT EXISTS} is a deliberate no-op, which this test also covers
 * since the lookahead window can land inside that pre-existing range. user_action_audit_logs only
 * has explicit partitions through 2026-08 (V028), so this job creating the next
 * {@link PartitionMaintenanceJob#LOOKAHEAD_MONTHS}-worth for that table is a real, previously-absent
 * effect being verified here, not a no-op.
 * <p>
 * Deliberately drops only the partitions this test itself created (tracked in {@code createdByTest}),
 * never partitions that already existed before the job ran -- this must stay safe to run repeatedly
 * against a persistent local dev database, not a disposable one.
 */
class PartitionMaintenanceJobTest extends AbstractIntegrationTest {

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy_MM");

    @Autowired private PartitionMaintenanceJob partitionMaintenanceJob;
    @Autowired private JdbcTemplate jdbcTemplate;

    private final List<String> createdByTest = new ArrayList<>();

    @AfterEach
    void dropPartitionsCreatedByTest() {
        for (String partition : createdByTest) {
            jdbcTemplate.execute("DROP TABLE IF EXISTS " + partition);
        }
    }

    @Test
    void createUpcomingPartitions_createsPartitionsForBothTables() {
        for (String table : PartitionMaintenanceJob.PARTITIONED_TABLES) {
            for (int monthsAhead = 1; monthsAhead <= 3; monthsAhead++) {
                String partitionName = table + "_" + YearMonth.now().plusMonths(monthsAhead).format(MONTH_FMT);
                Boolean existedBefore = jdbcTemplate.queryForObject(
                        "SELECT to_regclass(?) IS NOT NULL", Boolean.class, partitionName);
                if (Boolean.FALSE.equals(existedBefore)) {
                    createdByTest.add(partitionName);
                }
            }
        }

        partitionMaintenanceJob.createUpcomingPartitions();

        for (String table : PartitionMaintenanceJob.PARTITIONED_TABLES) {
            for (int monthsAhead = 1; monthsAhead <= 3; monthsAhead++) {
                String partitionName = table + "_" + YearMonth.now().plusMonths(monthsAhead).format(MONTH_FMT);
                Boolean exists = jdbcTemplate.queryForObject(
                        "SELECT to_regclass(?) IS NOT NULL", Boolean.class, partitionName);
                assertThat(exists)
                        .as("partition %s should exist after the job runs", partitionName)
                        .isTrue();
            }
        }
    }
}
