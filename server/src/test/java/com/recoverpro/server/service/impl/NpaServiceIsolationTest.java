package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.NpaRecord;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.NpaRiskLevel;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.NpaRecordRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.NpaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NpaServiceIsolationTest extends AbstractIntegrationTest {

    @Autowired private NpaService npaService;
    @Autowired private NpaRecordRepository npaRecordRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private FileUploadRepository fileUploadRepository;

    private NpaRecord recordInOrgA;
    private Allocation allocationInOrgA;
    private FileUpload uploadInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (orgA != null) RlsOrgIdHolder.set(orgA.getId());
        if (recordInOrgA != null) npaRecordRepository.deleteById(recordInOrgA.getId());
        if (allocationInOrgA != null) allocationRepository.deleteById(allocationInOrgA.getId());
        if (uploadInOrgA != null) fileUploadRepository.deleteById(uploadInOrgA.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void resolveNpaRecord_crossOrg_throwsNotFound() {
        orgA = createOrg("sp14-a");
        Organization orgB = createOrg("sp14-b");

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
                .status(AllocationStatus.ASSIGNED)
                .totalDue(BigDecimal.TEN)
                .build());
        recordInOrgA = npaRecordRepository.save(NpaRecord.builder()
                .organizationId(orgA.getId())
                .allocationId(allocationInOrgA.getId())
                .loanNumber(allocationInOrgA.getLoanNumber())
                .borrowerName("Test Borrower")
                .outstandingAmount(BigDecimal.valueOf(50000))
                .overdueDays(120)
                .riskLevel(NpaRiskLevel.HIGH)
                .flaggedDate(LocalDate.now())
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_MANAGER");
        actAsUser(strangerInOrgB);
        RlsOrgIdHolder.set(orgA.getId());

        assertThatThrownBy(() -> npaService.resolveNpaRecord(recordInOrgA.getId(), UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
