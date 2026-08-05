package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.KeyFactStatementResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.KeyFactStatement;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.RestructureProposal;
import com.recoverpro.server.enums.KfsGenerationReason;
import com.recoverpro.server.enums.RestructureStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.KeyFactStatementRepository;
import com.recoverpro.server.repository.RestructureProposalRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KfsServiceImplTest {

    @Mock private KeyFactStatementRepository kfsRepository;
    @Mock private RestructureProposalRepository proposalRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    @TempDir
    Path tempDir;

    private KfsServiceImpl service;

    private UUID orgId;
    private UUID allocationId;
    private UUID proposalId;
    private UUID userId;

    @BeforeEach
    void setUp() throws ReflectiveOperationException {
        service = new KfsServiceImpl(kfsRepository, proposalRepository, allocationRepository, orgIsolationGuard);
        var field = KfsServiceImpl.class.getDeclaredField("kfsPath");
        field.setAccessible(true);
        field.set(service, tempDir.toString());

        lenient().when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        orgId = UUID.randomUUID();
        allocationId = UUID.randomUUID();
        proposalId = UUID.randomUUID();
        userId = UUID.randomUUID();
        lenient().when(kfsRepository.save(any(KeyFactStatement.class))).thenAnswer(inv -> {
            KeyFactStatement k = inv.getArgument(0);
            k.setId(UUID.randomUUID());
            return k;
        });
    }

    private Allocation allocationFixture(BigDecimal outstanding) {
        Organization org = new Organization();
        org.setId(orgId);
        return Allocation.builder()
                .id(allocationId)
                .organization(org)
                .loanNumber("QA-LN-KFS-TEST")
                .borrowerName("Test Borrower")
                .outstandingAmount(outstanding)
                .isDeleted(false)
                .build();
    }

    private RestructureProposal proposalFixture(RestructureStatus status) {
        return RestructureProposal.builder()
                .id(proposalId)
                .organizationId(orgId)
                .allocationId(allocationId)
                .status(status)
                .originalEmiCount(24)
                .originalEmiAmount(new BigDecimal("4500.00"))
                .originalApr(new BigDecimal("18.00"))
                .newEmiCount(12)
                .newEmiAmount(new BigDecimal("5000.00"))
                .newApr(new BigDecimal("14.50"))
                .draftedByUserId(userId)
                .build();
    }

    @Test
    void generate_approvedProposal_createsWithDerivedFields() {
        when(proposalRepository.findById(proposalId))
                .thenReturn(Optional.of(proposalFixture(RestructureStatus.APPROVED)));
        when(kfsRepository.findByRestructureProposalId(proposalId)).thenReturn(Optional.empty());
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId))
                .thenReturn(Optional.of(allocationFixture(new BigDecimal("10000.00"))));

        KeyFactStatementResponse response = service.generate(proposalId, userId);

        assertThat(response.getGenerationReason()).isEqualTo(KfsGenerationReason.RESTRUCTURING);
        assertThat(response.getSanctionedAmount()).isEqualByComparingTo("10000.00");
        assertThat(response.getEmiAmount()).isEqualByComparingTo("5000.00");
        assertThat(response.getTenureMonths()).isEqualTo(12);
        assertThat(response.getAprPercent()).isEqualByComparingTo("14.50");
        assertThat(response.getInterestRatePercent()).isEqualByComparingTo("14.50");
        assertThat(response.getRepaymentFrequency()).isEqualTo("MONTHLY");
        assertThat(response.getTotalPayable()).isEqualByComparingTo("60000.00");
        assertThat(response.getTotalInterestCharge()).isEqualByComparingTo("50000.00");
        assertThat(response.getProcessingFee()).isNull();
        assertThat(response.getOtherCharges()).isNull();
        assertThat(response.getNetDisbursedAmount()).isNull();
        assertThat(response.getContentSha256()).hasSize(64);
        assertThat(response.getPdfSha256()).hasSize(64);

        verify(kfsRepository).save(any(KeyFactStatement.class));
    }

    @Test
    void generate_writesActualPdfFileToStorage() throws Exception {
        when(proposalRepository.findById(proposalId))
                .thenReturn(Optional.of(proposalFixture(RestructureStatus.APPROVED)));
        when(kfsRepository.findByRestructureProposalId(proposalId)).thenReturn(Optional.empty());
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId))
                .thenReturn(Optional.of(allocationFixture(new BigDecimal("10000.00"))));

        service.generate(proposalId, userId);

        Path expected = tempDir.resolve(orgId.toString()).resolve("kfs_" + proposalId + ".pdf");
        assertThat(Files.exists(expected)).isTrue();
        assertThat(Files.size(expected)).isGreaterThan(0);
    }

    @Test
    void generate_alreadyExists_returnsExistingWithoutRegenerating() {
        when(proposalRepository.findById(proposalId))
                .thenReturn(Optional.of(proposalFixture(RestructureStatus.APPROVED)));
        KeyFactStatement existing = KeyFactStatement.builder()
                .id(UUID.randomUUID()).organizationId(orgId).allocationId(allocationId)
                .restructureProposalId(proposalId).generationReason(KfsGenerationReason.RESTRUCTURING)
                .build();
        when(kfsRepository.findByRestructureProposalId(proposalId)).thenReturn(Optional.of(existing));

        KeyFactStatementResponse response = service.generate(proposalId, userId);

        assertThat(response.getId()).isEqualTo(existing.getId());
        verify(kfsRepository, never()).save(any());
        verify(allocationRepository, never()).findByIdAndIsDeletedFalse(any());
    }

    @Test
    void generate_proposalNotApproved_throwsBusinessException() {
        when(proposalRepository.findById(proposalId))
                .thenReturn(Optional.of(proposalFixture(RestructureStatus.DRAFT)));
        when(kfsRepository.findByRestructureProposalId(proposalId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate(proposalId, userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("APPROVED");
        verify(kfsRepository, never()).save(any());
    }

    @Test
    void generate_proposalNotFound_throwsResourceNotFoundException() {
        when(proposalRepository.findById(proposalId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate(proposalId, userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void generate_foreignOrgProposal_throwsResourceNotFoundExceptionBeforeCheckingExisting() {
        when(proposalRepository.findById(proposalId))
                .thenReturn(Optional.of(proposalFixture(RestructureStatus.APPROVED)));
        when(orgIsolationGuard.belongsToOrg(orgId)).thenReturn(false);

        assertThatThrownBy(() -> service.generate(proposalId, userId))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(kfsRepository, never()).findByRestructureProposalId(any());
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(kfsRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getByRestructureProposalId_notFound_throwsResourceNotFoundException() {
        when(kfsRepository.findByRestructureProposalId(proposalId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getByRestructureProposalId(proposalId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
