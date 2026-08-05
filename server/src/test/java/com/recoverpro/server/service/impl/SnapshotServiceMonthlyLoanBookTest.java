package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.MonthlyLoanBookSnapshot;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.PaymentMode;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.MonthlyLoanBookSnapshotRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.SnapshotService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class SnapshotServiceMonthlyLoanBookTest extends AbstractIntegrationTest {

    @Autowired private SnapshotService snapshotService;
    @Autowired private MonthlyLoanBookSnapshotRepository loanBookSnapshotRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private CollectionRepository collectionRepository;

    private Organization org;
    private FileUpload upload;
    private Allocation allocation;
    private Collection collection;
    private MonthlyLoanBookSnapshot snapshot;

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            if (snapshot != null) loanBookSnapshotRepository.deleteById(snapshot.getId());
            if (collection != null) collectionRepository.deleteById(collection.getId());
            if (allocation != null) allocationRepository.deleteById(allocation.getId());
            if (upload != null) fileUploadRepository.deleteById(upload.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void captureMonthlyLoanBookSnapshot_computesRealTotalsNotZeros() {
        org = createOrg("sp9-snapshot");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        User submitter = createUser(org, "ROLE_FO");

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("sp9.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("sp9-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());

        allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload)
                .organization(managedOrg)
                .loanNumber("LN-SP9-" + System.nanoTime())
                .borrowerName("Snapshot Borrower")
                .status(AllocationStatus.ASSIGNED)
                .totalDue(BigDecimal.valueOf(10000))
                .outstandingAmount(BigDecimal.valueOf(10000))
                .build());

        LocalDate today = LocalDate.now();
        collection = collectionRepository.save(Collection.builder()
                .organizationId(org.getId())
                .allocationId(allocation.getId())
                .loanNumber(allocation.getLoanNumber())
                .amount(BigDecimal.valueOf(2500))
                .paymentMode(PaymentMode.CASH)
                .collectionDate(today)
                .status(CollectionStatus.APPROVED)
                .submittedBy(submitter.getId())
                .idempotencyKey("sp9-key-" + System.nanoTime())
                .build());

        snapshotService.captureMonthlyLoanBookSnapshot(org.getId(), today.getMonthValue(), today.getYear());

        snapshot = loanBookSnapshotRepository
                .findByOrganizationIdAndSnapshotMonth(org.getId(), today.withDayOfMonth(1))
                .orElseThrow();

        assertThat(snapshot.getTotalLoans()).isEqualTo(1);
        assertThat(snapshot.getTotalOutstandingAmount()).isEqualByComparingTo("10000");
        assertThat(snapshot.getTotalCollectedAmount()).isEqualByComparingTo("2500");
        assertThat(snapshot.getTotalAssignedLoans()).isEqualTo(1);
        assertThat(snapshot.getTotalUnassignedLoans()).isEqualTo(0);
        assertThat(snapshot.getCollectionEfficiencyPct()).isEqualByComparingTo("25.00");
        assertThat(snapshot.getRecoveryRatePct()).isEqualByComparingTo("25.00");
    }
}
