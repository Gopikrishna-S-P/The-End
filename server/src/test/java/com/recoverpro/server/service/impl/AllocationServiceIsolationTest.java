package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.UpdateAllocationStatusRequest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.AllocationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AllocationServiceIsolationTest extends AbstractIntegrationTest {

    @Autowired private AllocationService allocationService;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private FileUploadRepository fileUploadRepository;

    private Allocation allocationInOrgA;
    private FileUpload uploadInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (orgA != null) RlsOrgIdHolder.set(orgA.getId());
        if (allocationInOrgA != null) allocationRepository.deleteById(allocationInOrgA.getId());
        if (uploadInOrgA != null) fileUploadRepository.deleteById(uploadInOrgA.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void updateAllocationStatus_crossOrg_throwsNotFound() {
        orgA = createOrg("sp13-a");
        Organization orgB = createOrg("sp13-b");

        RlsOrgIdHolder.set(orgA.getId());
        Organization managedOrgA = organizationRepository.findById(orgA.getId()).orElseThrow();
        uploadInOrgA = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrgA)
                .originalFilename("it-test.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("it-test-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        allocationInOrgA = allocationRepository.save(Allocation.builder()
                .fileUpload(uploadInOrgA)
                .organization(managedOrgA)
                .loanNumber("LN-IT-" + System.nanoTime())
                .borrowerName("Test Borrower")
                .status(AllocationStatus.UNASSIGNED)
                .totalDue(BigDecimal.TEN)
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_MANAGER");
        actAsUser(strangerInOrgB);
        // Decouple RLS context from the principal to prove the service-layer guard specifically.
        RlsOrgIdHolder.set(orgA.getId());

        UpdateAllocationStatusRequest request = UpdateAllocationStatusRequest.builder()
                .status(AllocationStatus.ASSIGNED)
                .build();

        assertThatThrownBy(() -> allocationService.updateAllocationStatus(
                allocationInOrgA.getId(), request, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
