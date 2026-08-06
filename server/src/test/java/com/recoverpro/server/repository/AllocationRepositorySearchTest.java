package com.recoverpro.server.repository;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationNameSearchToken;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.encryption.LookupHashService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationRepositorySearchTest extends AbstractIntegrationTest {

    @Autowired private AllocationRepository allocationRepository;
    @Autowired private AllocationNameSearchTokenRepository tokenRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private LookupHashService lookupHashService;

    private Organization org;
    private FileUpload upload;
    private Allocation smithAllocation;
    private Allocation doeAllocation;

    @AfterEach
    void cleanup() {
        if (org != null) RlsOrgIdHolder.set(org.getId());
        if (smithAllocation != null) allocationRepository.deleteById(smithAllocation.getId());
        if (doeAllocation != null) allocationRepository.deleteById(doeAllocation.getId());
        if (upload != null) fileUploadRepository.deleteById(upload.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void findAllWithFilters_searchTerm_matchesByLoanNumberPrefixOrNameToken() {
        org = createOrg("sp-search-repo");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("it-search-repo.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash("it-search-repo-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(2)
                .build());

        String smithLoan = "LN-SMITH-" + System.nanoTime();
        smithAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber(smithLoan).borrowerName("John Smith")
                .status(AllocationStatus.UNASSIGNED).totalDue(BigDecimal.TEN)
                .build());
        tokenRepository.save(AllocationNameSearchToken.builder()
                .allocationId(smithAllocation.getId())
                .tokenHash(lookupHashService.hash("smith"))
                .organizationId(managedOrg.getId())
                .build());

        doeAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber("LN-OTHER-" + System.nanoTime()).borrowerName("Jane Doe")
                .status(AllocationStatus.UNASSIGNED).totalDue(BigDecimal.TEN)
                .build());
        tokenRepository.save(AllocationNameSearchToken.builder()
                .allocationId(doeAllocation.getId())
                .tokenHash(lookupHashService.hash("doe"))
                .organizationId(managedOrg.getId())
                .build());

        Page<Allocation> byName = allocationRepository.findAllWithFilters(
                managedOrg.getId(), null, null, null, "smith", lookupHashService.hash("smith"),
                PageRequest.of(0, 20));
        assertThat(byName.getContent()).extracting(Allocation::getId).containsExactly(smithAllocation.getId());

        Page<Allocation> byLoanNumber = allocationRepository.findAllWithFilters(
                managedOrg.getId(), null, null, null, smithLoan.substring(0, smithLoan.length() - 3), null,
                PageRequest.of(0, 20));
        assertThat(byLoanNumber.getContent()).extracting(Allocation::getId).containsExactly(smithAllocation.getId());

        Page<Allocation> noTerm = allocationRepository.findAllWithFilters(
                managedOrg.getId(), null, null, null, null, null, PageRequest.of(0, 20));
        assertThat(noTerm.getContent()).extracting(Allocation::getId)
                .containsExactlyInAnyOrder(smithAllocation.getId(), doeAllocation.getId());
    }
}
