package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.RestructureProposal;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.RestructureStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.RestructureProposalRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.PtpService;
import com.recoverpro.server.service.RestructureProposalService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PtpAndRestructureIsolationTest extends AbstractIntegrationTest {

    @Autowired private PtpService ptpService;
    @Autowired private RestructureProposalService restructureProposalService;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private RestructureProposalRepository restructureProposalRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private Allocation allocationInOrgA;
    private FileUpload uploadInOrgA;
    private RestructureProposal proposalInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (orgA != null) RlsOrgIdHolder.set(orgA.getId());
        if (proposalInOrgA != null) restructureProposalRepository.deleteById(proposalInOrgA.getId());
        if (allocationInOrgA != null) {
            try {
                // ptp_audit_logs is immutable by design (compliance audit trail — cannot be
                // deleted, ever). This delete only matters if the fix under test failed to block
                // PTP creation (leaving an audit row + FK'd allocation behind); once the fix is
                // in place no PTP/audit row is ever created here, so this is a no-op in the
                // passing case. Swallow failures so a cleanup limitation never masks the real
                // test result.
                jdbcTemplate.update("DELETE FROM ptp_records WHERE allocation_id = ?", allocationInOrgA.getId());
                allocationRepository.deleteById(allocationInOrgA.getId());
            } catch (Exception e) {
                System.err.println("Cleanup could not remove allocation " + allocationInOrgA.getId()
                        + " (likely referenced by an immutable audit row): " + e.getMessage());
            }
        }
        if (uploadInOrgA != null) {
            try {
                fileUploadRepository.deleteById(uploadInOrgA.getId());
            } catch (Exception e) {
                System.err.println("Cleanup could not remove upload " + uploadInOrgA.getId() + ": " + e.getMessage());
            }
        }
        RlsOrgIdHolder.clear();
    }

    @Test
    void createPtp_crossOrgAllocation_throwsNotFound() {
        orgA = createOrg("sp17-ptp-a");
        Organization orgB = createOrg("sp17-ptp-b");

        RlsOrgIdHolder.set(orgA.getId());
        Organization managedOrgA = organizationRepository.findById(orgA.getId()).orElseThrow();
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
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_FO");
        actAsUser(strangerInOrgB);
        RlsOrgIdHolder.set(orgA.getId());

        CreatePtpRequest request = CreatePtpRequest.builder()
                .allocationId(allocationInOrgA.getId())
                .agentId(strangerInOrgB.getId())
                .agentName("Stranger")
                .loanNumber(allocationInOrgA.getLoanNumber())
                .borrowerName("Test Borrower")
                .promisedDate(LocalDate.now().plusDays(7))
                .promisedAmount(BigDecimal.TEN)
                .build();

        assertThatThrownBy(() -> ptpService.createPtp(request, strangerInOrgB.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void restructureProposalGetById_crossOrg_throwsNotFound() {
        orgA = createOrg("sp17-restruct-a");
        Organization orgB = createOrg("sp17-restruct-b");

        RlsOrgIdHolder.set(orgA.getId());
        Organization managedOrgA = organizationRepository.findById(orgA.getId()).orElseThrow();
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
        User drafterInOrgA = createUser(orgA, "ROLE_MANAGER");
        proposalInOrgA = restructureProposalRepository.save(RestructureProposal.builder()
                .organizationId(orgA.getId())
                .allocationId(allocationInOrgA.getId())
                .originalEmiCount(12)
                .originalEmiAmount(BigDecimal.valueOf(1000))
                .originalApr(BigDecimal.valueOf(24))
                .newEmiCount(24)
                .newEmiAmount(BigDecimal.valueOf(600))
                .newApr(BigDecimal.valueOf(18))
                .status(RestructureStatus.DRAFT)
                .draftedByUserId(drafterInOrgA.getId())
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_MANAGER");
        actAsUser(strangerInOrgB);
        RlsOrgIdHolder.set(orgA.getId());

        assertThatThrownBy(() -> restructureProposalService.getById(proposalInOrgA.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
