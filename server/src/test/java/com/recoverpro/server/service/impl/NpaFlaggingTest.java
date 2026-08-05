package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.NpaRecord;
import com.recoverpro.server.entity.Organization;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class NpaFlaggingTest extends AbstractIntegrationTest {

    @Autowired private NpaService npaService;
    @Autowired private NpaRecordRepository npaRecordRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private FileUploadRepository fileUploadRepository;

    private Organization org;
    private FileUpload upload;
    private Allocation overdueAllocation;
    private Allocation currentAllocation;

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            npaRecordRepository.findByAllocationIdAndIsResolvedFalse(overdueAllocation.getId())
                    .ifPresent(r -> npaRecordRepository.deleteById(r.getId()));
            if (currentAllocation != null) {
                npaRecordRepository.findByAllocationIdAndIsResolvedFalse(currentAllocation.getId())
                        .ifPresent(r -> npaRecordRepository.deleteById(r.getId()));
            }
            if (overdueAllocation != null) allocationRepository.deleteById(overdueAllocation.getId());
            if (currentAllocation != null) allocationRepository.deleteById(currentAllocation.getId());
            if (upload != null) fileUploadRepository.deleteById(upload.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void flagOverdueAllocations_createsNpaRecordForAllocationPastDpdThreshold() {
        org = createOrg("sp6-npa");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("sp6.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("sp6-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(2)
                .build());

        overdueAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload)
                .organization(managedOrg)
                .loanNumber("LN-SP6-OVERDUE-" + System.nanoTime())
                .borrowerName("Overdue Borrower")
                .status(AllocationStatus.ASSIGNED)
                .totalDue(BigDecimal.valueOf(10000))
                .outstandingAmount(BigDecimal.valueOf(8000))
                .dynamicData(Map.of("dpd_days", 120))
                .build());

        currentAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload)
                .organization(managedOrg)
                .loanNumber("LN-SP6-CURRENT-" + System.nanoTime())
                .borrowerName("Current Borrower")
                .status(AllocationStatus.ASSIGNED)
                .totalDue(BigDecimal.valueOf(5000))
                .outstandingAmount(BigDecimal.valueOf(4000))
                .dynamicData(Map.of("dpd_days", 5))
                .build());

        int flagged = npaService.flagOverdueAllocations(org.getId());

        assertThat(flagged).isEqualTo(1);
        Optional<NpaRecord> record = npaRecordRepository.findByAllocationIdAndIsResolvedFalse(overdueAllocation.getId());
        assertThat(record).isPresent();
        assertThat(record.get().getRiskLevel()).isEqualTo(NpaRiskLevel.CRITICAL);
        assertThat(record.get().getOverdueDays()).isEqualTo(120);

        assertThat(npaRecordRepository.findByAllocationIdAndIsResolvedFalse(currentAllocation.getId())).isEmpty();
    }
}
