package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.importer.AllocationImportProcessor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FileProcessingBorrowerLinkTest extends AbstractIntegrationTest {

    @Autowired private FileProcessingServiceImpl fileProcessingService;
    @Autowired private AllocationImportProcessor allocationImportProcessor;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private BorrowerRepository borrowerRepository;
    @Autowired private javax.sql.DataSource dataSource;

    private Organization org;
    private FileUpload upload;
    private Allocation firstUploadAllocation;
    private Allocation secondUploadAllocation;
    private Borrower borrower;

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            if (firstUploadAllocation != null) allocationRepository.deleteById(firstUploadAllocation.getId());
            if (secondUploadAllocation != null) allocationRepository.deleteById(secondUploadAllocation.getId());
            if (borrower != null) borrowerRepository.deleteById(borrower.getId());
            if (upload != null) fileUploadRepository.deleteById(upload.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void processRowsInBatches_linksAllocationToBorrowerByCkycId_andReusesSameBorrowerOnSecondUpload() {
        org = createOrg("sp4-borrower");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("sp4.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("sp4-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());

        String loanNumber = "LN-SP4-" + System.nanoTime();
        Map<String, String> row = new LinkedHashMap<>();
        row.put("loan_number", loanNumber);
        row.put("borrower_name", "Jane Doe");
        row.put("ckyc_id", "CKYC-12345");
        row.put("total_due", "5000");
        row.put("outstanding", "4000");

        fileProcessingService.processRowsInBatches(
                allocationImportProcessor, upload, managedOrg, List.of(), List.of(row));

        firstUploadAllocation = allocationRepository.findByOrganizationIdAndLoanNumberIn(
                org.getId(), List.of(loanNumber)).get(0);
        assertThat(firstUploadAllocation.getBorrowerId()).isNotNull();

        borrower = borrowerRepository.findById(firstUploadAllocation.getBorrowerId()).orElseThrow();
        assertThat(borrower.getCkycId()).isEqualTo("CKYC-12345");

        // A second upload row with the SAME ckyc_id but a different loan number must resolve
        // to the SAME Borrower row, not create a duplicate.
        String secondLoanNumber = "LN-SP4-B-" + System.nanoTime();
        Map<String, String> secondRow = new LinkedHashMap<>();
        secondRow.put("loan_number", secondLoanNumber);
        secondRow.put("borrower_name", "Jane Doe");
        secondRow.put("ckyc_id", "CKYC-12345");
        secondRow.put("total_due", "3000");
        secondRow.put("outstanding", "2000");

        fileProcessingService.processRowsInBatches(
                allocationImportProcessor, upload, managedOrg, List.of(), List.of(secondRow));

        secondUploadAllocation = allocationRepository.findByOrganizationIdAndLoanNumberIn(
                org.getId(), List.of(secondLoanNumber)).get(0);
        assertThat(secondUploadAllocation.getBorrowerId()).isEqualTo(borrower.getId());
        assertThat(borrowerRepository.count()).isGreaterThanOrEqualTo(1);
    }

    /**
     * SYSTEM-PLAN 35.1: AllocationImportProcessor used to copy the entire raw row into
     * dynamic_data, duplicating borrower_name/ckyc_id/phone/email in plaintext right next to
     * their AES-256-GCM encrypted, dedicated columns. This asserts the fix at the only level
     * that actually matters -- a raw JDBC read of the jsonb column, bypassing the entity's own
     * (correct) decryption of borrowerName/Borrower fields, which would otherwise mask the bug.
     */
    @Test
    void processRowsInBatches_neverCopiesPiiIntoDynamicData() throws Exception {
        org = createOrg("sp35-pii");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("sp35.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("sp35-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());

        String loanNumber = "LN-SP35-" + System.nanoTime();
        Map<String, String> row = new LinkedHashMap<>();
        row.put("loan_number", loanNumber);
        row.put("borrower_name", "PII Test Borrower");
        row.put("ckyc_id", "CKYC-PII-99999");
        row.put("phone", "9876500000");
        row.put("email", "pii-test@example.com");
        row.put("total_due", "5000");
        row.put("outstanding", "4000");
        row.put("branch", "Mumbai Central");

        fileProcessingService.processRowsInBatches(
                allocationImportProcessor, upload, managedOrg, List.of(), List.of(row));

        firstUploadAllocation = allocationRepository.findByOrganizationIdAndLoanNumberIn(
                org.getId(), List.of(loanNumber)).get(0);
        borrower = borrowerRepository.findById(firstUploadAllocation.getBorrowerId()).orElseThrow();

        assertThat(firstUploadAllocation.getDynamicData()).containsKey("branch");
        assertThat(firstUploadAllocation.getDynamicData().keySet())
                .noneMatch(key -> key.equalsIgnoreCase("borrower_name"))
                .noneMatch(key -> key.equalsIgnoreCase("ckyc_id"))
                .noneMatch(key -> key.equalsIgnoreCase("phone"))
                .noneMatch(key -> key.equalsIgnoreCase("email"))
                .noneMatch(key -> key.equalsIgnoreCase("loan_number"));

        // Raw JDBC, bypassing JPA/Hibernate entirely, on the app's own (RLS-aware) DataSource
        // bean -- RlsOrgIdHolder is already set to this org above, so the pool stamps
        // app.current_org_id on checkout exactly as it does for every repository call.
        try (java.sql.Connection conn = dataSource.getConnection();
             java.sql.PreparedStatement ps = conn.prepareStatement(
                     "SELECT dynamic_data::text FROM allocations WHERE id = ?")) {
            ps.setObject(1, firstUploadAllocation.getId());
            try (java.sql.ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                String rawJson = rs.getString(1);
                assertThat(rawJson)
                        .doesNotContain("PII Test Borrower")
                        .doesNotContain("CKYC-PII-99999")
                        .doesNotContain("9876500000")
                        .doesNotContain("pii-test@example.com");
            }
        }
    }
}
