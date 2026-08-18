package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SYSTEM-PLAN 35.1 (backfill half): V093 exists to clean up allocations.dynamic_data rows that
 * were written by AllocationImportProcessor before it stopped duplicating PII into that column.
 * V093 already ran once (as part of this test's own schema bootstrap), so it cannot be exercised
 * by re-triggering Flyway -- instead this replays the migration's own SQL file against a row that
 * simulates the pre-fix, plaintext-PII shape it was written to clean up, and asserts on the
 * result. If this migration's SQL is ever edited, this test is reading the edited file, not a
 * copy, so it cannot silently drift from what production actually runs.
 */
class AllocationDynamicDataBackfillMigrationTest extends AbstractIntegrationTest {

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private AllocationRepository allocationRepository;

    private Organization org;
    private FileUpload upload;
    private Allocation allocation;

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            if (allocation != null) allocationRepository.deleteById(allocation.getId());
            if (upload != null) fileUploadRepository.deleteById(upload.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void migrationSql_stripsDedicatedFieldKeys_fromPreExistingPlaintextDynamicData() throws Exception {
        org = createOrg("v093-backfill");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("legacy.csv")
                .contentType("text/csv")
                .fileSizeBytes(50L)
                .sha256Hash("v093-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());

        // Simulates a row written by the pre-fix importer: the whole raw row, including PII
        // aliases in mixed casing/spacing, dumped into dynamic_data.
        allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload)
                .organization(managedOrg)
                .loanNumber("LN-V093-" + System.nanoTime())
                .borrowerName("Legacy Borrower")
                .rowNumber(1)
                .dynamicData(java.util.Map.of(
                        "Borrower Name", "Legacy Borrower",
                        "CKYC_ID", "CKYC-LEGACY-1",
                        "Mobile Number", "9998887770",
                        "email_address", "legacy@example.com",
                        "branch", "Pune"))
                .build());

        Path migrationFile = Path.of("src/main/resources/db/migration",
                "V093__backfill_allocation_dynamic_data_pii.sql");
        String migrationSql = Files.readString(migrationFile);
        assertThat(migrationSql).as("migration file must exist at the expected path").isNotBlank();

        jdbcTemplate.execute(migrationSql);

        String rawJson = jdbcTemplate.queryForObject(
                "SELECT dynamic_data::text FROM allocations WHERE id = ?",
                String.class, allocation.getId());

        assertThat(rawJson)
                .doesNotContain("Legacy Borrower")
                .doesNotContain("CKYC-LEGACY-1")
                .doesNotContain("9998887770")
                .doesNotContain("legacy@example.com")
                .contains("Pune");
    }
}
