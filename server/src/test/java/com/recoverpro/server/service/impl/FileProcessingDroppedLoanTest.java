package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Assignment;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.Priority;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class FileProcessingDroppedLoanTest extends AbstractIntegrationTest {

    @Autowired private FileUploadPostProcessingService fileUploadPostProcessingService;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private AssignmentRepository assignmentRepository;

    private Organization org;
    private FileUpload oldUpload;
    private FileUpload newUpload;
    private Allocation droppedAllocation;
    private Allocation carriedAllocation;
    private Assignment droppedAssignment;
    private Assignment carriedAssignment;

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            if (droppedAssignment != null) assignmentRepository.deleteById(droppedAssignment.getId());
            if (carriedAssignment != null) assignmentRepository.deleteById(carriedAssignment.getId());
            if (droppedAllocation != null) allocationRepository.deleteById(droppedAllocation.getId());
            if (carriedAllocation != null) allocationRepository.deleteById(carriedAllocation.getId());
            if (oldUpload != null) fileUploadRepository.deleteById(oldUpload.getId());
            if (newUpload != null) fileUploadRepository.deleteById(newUpload.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void cancelDroppedLoanAssignments_cancelsOnlyAssignmentsForAllocationsNotInNewestUpload() {
        org = createOrg("sp5-dropped");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        User agent = createUser(org, "ROLE_FO");

        oldUpload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("old.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("sp5-old-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        newUpload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("new.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("sp5-new-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());

        // This allocation stayed on the OLD upload - it dropped out of the new month's book.
        droppedAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(oldUpload)
                .organization(managedOrg)
                .loanNumber("LN-SP5-DROPPED-" + System.nanoTime())
                .borrowerName("Dropped Borrower")
                .status(AllocationStatus.ASSIGNED)
                .totalDue(BigDecimal.TEN)
                .build());
        // This allocation was matched-and-updated onto the NEW upload - still in the book.
        carriedAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(newUpload)
                .organization(managedOrg)
                .loanNumber("LN-SP5-CARRIED-" + System.nanoTime())
                .borrowerName("Carried Borrower")
                .status(AllocationStatus.ASSIGNED)
                .totalDue(BigDecimal.TEN)
                .build());

        droppedAssignment = assignmentRepository.save(Assignment.builder()
                .allocationId(droppedAllocation.getId())
                .agentId(agent.getId())
                .organizationId(org.getId())
                .assignedBy(agent.getId())
                .priority(Priority.MEDIUM)
                .status(AssignmentStatus.PENDING)
                .assignmentDate(LocalDate.now())
                .build());
        carriedAssignment = assignmentRepository.save(Assignment.builder()
                .allocationId(carriedAllocation.getId())
                .agentId(agent.getId())
                .organizationId(org.getId())
                .assignedBy(agent.getId())
                .priority(Priority.MEDIUM)
                .status(AssignmentStatus.PENDING)
                .assignmentDate(LocalDate.now())
                .build());

        fileUploadPostProcessingService.cancelDroppedLoanAssignments(newUpload.getId(), org.getId());

        Assignment reloadedDropped = assignmentRepository.findById(droppedAssignment.getId()).orElseThrow();
        Assignment reloadedCarried = assignmentRepository.findById(carriedAssignment.getId()).orElseThrow();

        assertThat(reloadedDropped.getStatus()).isEqualTo(AssignmentStatus.CANCELLED);
        assertThat(reloadedCarried.getStatus()).isEqualTo(AssignmentStatus.PENDING);
    }
}
