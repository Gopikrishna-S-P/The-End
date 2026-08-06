package com.recoverpro.server.service.impl;

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
import com.recoverpro.server.service.AllocationSearchIndexService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationSearchIndexServiceImplTest extends AbstractIntegrationTest {

    @Autowired private AllocationSearchIndexService indexService;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private AllocationNameSearchTokenRepository tokenRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private LookupHashService lookupHashService;

    private Organization org;
    private Allocation allocation;
    private FileUpload upload;

    @AfterEach
    void cleanup() {
        if (org != null) RlsOrgIdHolder.set(org.getId());
        if (allocation != null) allocationRepository.deleteById(allocation.getId());
        if (upload != null) fileUploadRepository.deleteById(upload.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void reindex_writesPrefixTokensForCurrentName_andRemovesStaleOnes() {
        org = createOrg("sp-search-a");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("it-search.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash("it-search-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload)
                .organization(managedOrg)
                .loanNumber("LN-SEARCH-" + System.nanoTime())
                .borrowerName("John Smith")
                .status(AllocationStatus.UNASSIGNED)
                .totalDue(BigDecimal.TEN)
                .build());

        indexService.reindex(allocation);

        List<AllocationNameSearchToken> tokens = tokenRepository.findAll().stream()
                .filter(t -> t.getAllocationId().equals(allocation.getId()))
                .toList();
        assertThat(tokens).extracting(AllocationNameSearchToken::getTokenHash)
                .contains(lookupHashService.hash("smith"), lookupHashService.hash("john"));

        allocation.setBorrowerName("Jane Doe");
        allocationRepository.save(allocation);
        indexService.reindex(allocation);

        List<AllocationNameSearchToken> afterRename = tokenRepository.findAll().stream()
                .filter(t -> t.getAllocationId().equals(allocation.getId()))
                .toList();
        assertThat(afterRename).extracting(AllocationNameSearchToken::getTokenHash)
                .contains(lookupHashService.hash("jane"), lookupHashService.hash("doe"))
                .doesNotContain(lookupHashService.hash("smith"));
    }
}
