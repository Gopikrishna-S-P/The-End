package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationNameSearchToken;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationNameSearchTokenRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.encryption.LookupHashService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationNameTokenBackfillRunnerTest extends AbstractIntegrationTest {

    @Autowired private AllocationNameTokenBackfillRunner runner;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private AllocationNameSearchTokenRepository tokenRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private LookupHashService lookupHashService;

    private Organization org;
    private FileUpload upload;
    private Allocation allocation;

    @AfterEach
    void cleanup() {
        if (org != null) RlsOrgIdHolder.set(org.getId());
        if (allocation != null) allocationRepository.deleteById(allocation.getId());
        if (upload != null) fileUploadRepository.deleteById(upload.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void run_whenEnabled_backfillsTokensForExistingAllocationsWithoutAny() {
        org = createOrg("sp-search-backfill");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("it-backfill.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash("it-backfill-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber("LN-BACKFILL-" + System.nanoTime()).borrowerName("Backfill Borrower")
                .status(AllocationStatus.UNASSIGNED).totalDue(BigDecimal.TEN)
                .build());
        RlsOrgIdHolder.clear();

        ReflectionTestUtils.setField(runner, "enabled", true);
        runner.run();

        RlsOrgIdHolder.set(org.getId());
        List<AllocationNameSearchToken> tokens = tokenRepository.findAll().stream()
                .filter(t -> t.getAllocationId().equals(allocation.getId()))
                .toList();
        assertThat(tokens).extracting(AllocationNameSearchToken::getTokenHash)
                .contains(lookupHashService.hash("backfill"), lookupHashService.hash("borrower"));
    }
}
