package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.dto.request.PtpFilterRequest;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.PtpNameSearchTokenRepository;
import com.recoverpro.server.repository.PtpRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.PtpService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SYSTEM-PLAN 26.1: PtpSpecification.withFilters() used to match borrowerName with
 * cb.like(cb.lower(...), "%..%") directly against PtpRecord.borrowerName -- AES/GCM ciphertext
 * with a random IV per row -- which can never match. It silently returned zero rows instead of
 * erroring; a user searching for a promise by borrower name would conclude it did not exist.
 * This exercises the real create -> search path end to end: PtpServiceImpl.createPtp() reindexes
 * into ptp_name_search_tokens, and getAllPtps() resolves borrowerName through that blind index.
 */
class PtpBorrowerNameSearchTest extends AbstractIntegrationTest {

    @Autowired private PtpService ptpService;
    @Autowired private PtpRepository ptpRepository;
    @Autowired private PtpNameSearchTokenRepository tokenRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private FileUploadRepository fileUploadRepository;

    private Organization org;
    private FileUpload upload;
    private Allocation smithAllocation;
    private Allocation doeAllocation;
    private com.recoverpro.server.entity.PtpRecord smithPtp;
    private com.recoverpro.server.entity.PtpRecord doePtp;

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            // ptp_name_search_tokens has ON DELETE CASCADE on ptp_id, so deleting the PTP
            // itself is enough -- no separate, non-transactional deleteByPtpId call needed here.
            // ptp_audit_logs has no cascade (immutable compliance trail by design) and FKs both
            // ptp_records AND allocations, so deleting either here always fails once a PTP was
            // created -- same limitation PtpAndRestructureIsolationTest's cleanup already
            // documents; swallow it so it never masks the real test result above.
            try {
                if (smithPtp != null) ptpRepository.deleteById(smithPtp.getId());
                if (doePtp != null) ptpRepository.deleteById(doePtp.getId());
                if (smithAllocation != null) allocationRepository.deleteById(smithAllocation.getId());
                if (doeAllocation != null) allocationRepository.deleteById(doeAllocation.getId());
            } catch (Exception e) {
                System.err.println("Cleanup could not remove PTP/allocation rows (likely referenced "
                        + "by an immutable audit row): " + e.getMessage());
            }
            if (upload != null) {
                try {
                    fileUploadRepository.deleteById(upload.getId());
                } catch (Exception e) {
                    System.err.println("Cleanup could not remove upload " + upload.getId() + ": " + e.getMessage());
                }
            }
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void createPtp_thenSearchByBorrowerName_findsTheRightPtpOnly() {
        org = createOrg("sp26-ptp-search");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("sp26.csv")
                .contentType("text/csv")
                .fileSizeBytes(50L)
                .sha256Hash("sp26-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(2)
                .build());

        smithAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber("LN-SP26-SMITH-" + System.nanoTime()).borrowerName("Ptp Smith")
                .status(AllocationStatus.ASSIGNED).totalDue(BigDecimal.TEN)
                .build());
        doeAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber("LN-SP26-DOE-" + System.nanoTime()).borrowerName("Ptp Doe")
                .status(AllocationStatus.ASSIGNED).totalDue(BigDecimal.TEN)
                .build());

        User agent = createUser(org, "ROLE_FO");
        actAsUser(agent);

        PtpResponse smithResponse = ptpService.createPtp(CreatePtpRequest.builder()
                .allocationId(smithAllocation.getId())
                .agentId(agent.getId())
                .agentName("Agent")
                .loanNumber(smithAllocation.getLoanNumber())
                .borrowerName("Ptp Smith")
                .promisedDate(LocalDate.now().plusDays(5))
                .promisedAmount(BigDecimal.valueOf(1000))
                .build(), agent.getId());
        smithPtp = ptpRepository.findById(smithResponse.getId()).orElseThrow();

        PtpResponse doeResponse = ptpService.createPtp(CreatePtpRequest.builder()
                .allocationId(doeAllocation.getId())
                .agentId(agent.getId())
                .agentName("Agent")
                .loanNumber(doeAllocation.getLoanNumber())
                .borrowerName("Ptp Doe")
                .promisedDate(LocalDate.now().plusDays(5))
                .promisedAmount(BigDecimal.valueOf(2000))
                .build(), agent.getId());
        doePtp = ptpRepository.findById(doeResponse.getId()).orElseThrow();

        assertThat(tokenRepository.findByPtpId(smithPtp.getId()))
                .as("createPtp() must reindex into ptp_name_search_tokens, not just save the row")
                .isNotEmpty();

        var bySmith = ptpService.getAllPtps(
                PtpFilterRequest.builder().borrowerName("smith").build(), PageRequest.of(0, 20));
        assertThat(bySmith.getContent()).extracting(PtpResponse::getId).containsExactly(smithPtp.getId());

        var byDoe = ptpService.getAllPtps(
                PtpFilterRequest.builder().borrowerName("Doe").build(), PageRequest.of(0, 20));
        assertThat(byDoe.getContent()).extracting(PtpResponse::getId).containsExactly(doePtp.getId());

        var noBorrowerFilter = ptpService.getAllPtps(
                PtpFilterRequest.builder().allocationId(smithAllocation.getId()).build(), PageRequest.of(0, 20));
        assertThat(noBorrowerFilter.getContent()).extracting(PtpResponse::getId).containsExactly(smithPtp.getId());
    }
}
