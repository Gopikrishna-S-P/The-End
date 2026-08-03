package com.recoverpro.server.repository;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.BankStatementRow;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.ReconciliationRun;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.ReconciliationOutcome;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression coverage for the ReconciliationScheduler hourly sweep, which failed on every run
 * with InvalidDataAccessApiUsageException because findUnmatchedSince(LocalDateTime) was bound
 * against BankStatementRow.createdAt, an Instant column -- Hibernate rejects the parameter/column
 * type mismatch at query execution rather than coercing it.
 */
class BankStatementRowRepositoryTest extends AbstractIntegrationTest {

    @Autowired private BankStatementRowRepository rowRepository;
    @Autowired private ReconciliationRunRepository runRepository;

    private UUID createdRowId;
    private UUID createdRunId;

    @AfterEach
    void cleanupRowAndRun() {
        if (createdRowId != null) {
            rowRepository.deleteById(createdRowId);
        }
        if (createdRunId != null) {
            runRepository.deleteById(createdRunId);
        }
    }

    @Test
    void findRecentlyUnmatched_returnsRecentUnmatchedRows_withoutTypeMismatch() {
        Organization org = createOrg("recon-test");
        User admin = createUser(org, "ROLE_ORG_ADMIN");
        actAsUser(admin);

        ReconciliationRun run = runRepository.save(ReconciliationRun.builder()
                .organizationId(org.getId())
                .source("BANK")
                .asOfDate(LocalDate.now())
                .build());
        createdRunId = run.getId();

        BankStatementRow row = rowRepository.save(BankStatementRow.builder()
                .runId(run.getId())
                .amount(new BigDecimal("500.00"))
                .valueDate(LocalDate.now())
                .outcome(ReconciliationOutcome.UNMATCHED)
                .build());
        createdRowId = row.getId();

        List<BankStatementRow> result = rowRepository.findRecentlyUnmatched();

        assertThat(result).extracting(BankStatementRow::getId).contains(row.getId());
    }
}
