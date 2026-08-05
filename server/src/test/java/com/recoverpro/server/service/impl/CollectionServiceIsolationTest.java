package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.PaymentMode;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.CollectionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CollectionServiceIsolationTest extends AbstractIntegrationTest {

    @Autowired private CollectionService collectionService;
    @Autowired private CollectionRepository collectionRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private FileUploadRepository fileUploadRepository;

    private Collection collectionInOrgA;
    private Allocation allocationInOrgA;
    private FileUpload uploadInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (orgA != null) RlsOrgIdHolder.set(orgA.getId());
        if (collectionInOrgA != null) collectionRepository.deleteById(collectionInOrgA.getId());
        if (allocationInOrgA != null) allocationRepository.deleteById(allocationInOrgA.getId());
        if (uploadInOrgA != null) fileUploadRepository.deleteById(uploadInOrgA.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void cancelCollection_crossOrg_throwsNotFound() {
        orgA = createOrg("sp18-a");
        Organization orgB = createOrg("sp18-b");

        RlsOrgIdHolder.set(orgA.getId());
        Organization managedOrgA = organizationRepository.findById(orgA.getId()).orElseThrow();
        User submitterInOrgA = createUser(orgA, "ROLE_FO");
        uploadInOrgA = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrgA)
                .originalFilename("it.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("it-hash-" + System.nanoTime())
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
        collectionInOrgA = collectionRepository.save(Collection.builder()
                .organizationId(orgA.getId())
                .allocationId(allocationInOrgA.getId())
                .loanNumber(allocationInOrgA.getLoanNumber())
                .amount(BigDecimal.valueOf(1500))
                .paymentMode(PaymentMode.CASH)
                .collectionDate(LocalDate.now())
                .status(CollectionStatus.PENDING_APPROVAL)
                .submittedBy(submitterInOrgA.getId())
                .idempotencyKey("it-test-key-" + System.nanoTime())
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_MANAGER");
        actAsUser(strangerInOrgB);
        RlsOrgIdHolder.set(orgA.getId());

        // cancelCollection has no document-count side-call (unlike approve(), which is only
        // incidentally protected via DocumentService.getDocumentCount's own org check) - this
        // proves CollectionServiceImpl needs its own direct, independent guard.
        assertThatThrownBy(() -> collectionService.cancelCollection(
                collectionInOrgA.getId(), strangerInOrgB.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
