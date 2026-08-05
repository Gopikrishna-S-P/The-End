package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateRestructureProposalRequest;
import com.recoverpro.server.dto.request.RestructureBorrowerAcceptRequest;
import com.recoverpro.server.dto.request.RestructureRejectRequest;
import com.recoverpro.server.dto.response.RestructureProposalResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.RestructureProposal;
import com.recoverpro.server.enums.RestructureStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.RestructureProposalRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RestructureProposalServiceImplTest {

    @Mock private RestructureProposalRepository proposalRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private RestructureProposalServiceImpl service;

    private UUID orgId;
    private UUID allocationId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new RestructureProposalServiceImpl(proposalRepository, allocationRepository, orgIsolationGuard);
        lenient().when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        orgId = UUID.randomUUID();
        allocationId = UUID.randomUUID();
        userId = UUID.randomUUID();
        lenient().when(proposalRepository.save(any(RestructureProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Allocation allocationFixture() {
        Organization org = new Organization();
        org.setId(orgId);
        return Allocation.builder()
                .id(allocationId)
                .organization(org)
                .borrowerId(UUID.randomUUID())
                .isDeleted(false)
                .build();
    }

    private CreateRestructureProposalRequest draftRequest() {
        CreateRestructureProposalRequest request = new CreateRestructureProposalRequest();
        request.setAllocationId(allocationId);
        request.setOriginalEmiCount(12);
        request.setOriginalEmiAmount(new BigDecimal("5000.00"));
        request.setOriginalApr(new BigDecimal("18.00"));
        request.setNewEmiCount(24);
        request.setNewEmiAmount(new BigDecimal("2600.00"));
        request.setNewApr(new BigDecimal("16.00"));
        request.setRationale("Borrower income disruption");
        return request;
    }

    @Test
    void draft_createsProposalInDraftStatus() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId))
                .thenReturn(Optional.of(allocationFixture()));

        RestructureProposalResponse response = service.draft(draftRequest(), userId);

        assertThat(response.getStatus()).isEqualTo(RestructureStatus.DRAFT);
        assertThat(response.getOrganizationId()).isEqualTo(orgId);
        assertThat(response.getAllocationId()).isEqualTo(allocationId);
        assertThat(response.getDraftedByUserId()).isEqualTo(userId);
        assertThat(response.getNewEmiAmount()).isEqualByComparingTo("2600.00");
    }

    @Test
    void draft_allocationNotFound_throws() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.draft(draftRequest(), userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void fullLifecycle_draftToAccepted() {
        RestructureProposal proposal = RestructureProposal.builder()
                .id(UUID.randomUUID())
                .organizationId(orgId)
                .allocationId(allocationId)
                .status(RestructureStatus.DRAFT)
                .draftedByUserId(userId)
                .build();
        when(proposalRepository.findById(proposal.getId())).thenReturn(Optional.of(proposal));

        UUID lenderUserId = UUID.randomUUID();

        RestructureProposalResponse afterPropose = service.proposeToLender(proposal.getId(), userId);
        assertThat(afterPropose.getStatus()).isEqualTo(RestructureStatus.PROPOSED_TO_LENDER);
        assertThat(afterPropose.getProposedToLenderAt()).isNotNull();

        RestructureProposalResponse afterApprove = service.lenderApprove(proposal.getId(), lenderUserId);
        assertThat(afterApprove.getStatus()).isEqualTo(RestructureStatus.APPROVED);
        assertThat(afterApprove.getLenderApprovalUserId()).isEqualTo(lenderUserId);

        UUID consentId = UUID.randomUUID();
        RestructureBorrowerAcceptRequest acceptRequest = new RestructureBorrowerAcceptRequest();
        acceptRequest.setBorrowerConsentArtifactId(consentId);

        RestructureProposalResponse afterAccept = service.borrowerAccept(proposal.getId(), acceptRequest);
        assertThat(afterAccept.getStatus()).isEqualTo(RestructureStatus.ACCEPTED);
        assertThat(afterAccept.getBorrowerAcceptedAt()).isNotNull();
        assertThat(afterAccept.getBorrowerConsentArtifactId()).isEqualTo(consentId);
    }

    @Test
    void lenderReject_fromProposedToLender_setsReasonAndRejectedBy() {
        RestructureProposal proposal = RestructureProposal.builder()
                .id(UUID.randomUUID())
                .organizationId(orgId)
                .status(RestructureStatus.PROPOSED_TO_LENDER)
                .build();
        when(proposalRepository.findById(proposal.getId())).thenReturn(Optional.of(proposal));

        RestructureRejectRequest rejectRequest = new RestructureRejectRequest();
        rejectRequest.setReason("APR too aggressive");

        UUID lenderUserId = UUID.randomUUID();
        RestructureProposalResponse response = service.lenderReject(proposal.getId(), rejectRequest, lenderUserId);

        assertThat(response.getStatus()).isEqualTo(RestructureStatus.REJECTED);
        assertThat(response.getRejectedByUserId()).isEqualTo(lenderUserId);
        assertThat(response.getRejectionReason()).isEqualTo("APR too aggressive");
        assertThat(response.getRejectedAt()).isNotNull();
    }

    @Test
    void proposeToLender_wrongStartingStatus_throwsBusinessException() {
        RestructureProposal proposal = RestructureProposal.builder()
                .id(UUID.randomUUID())
                .status(RestructureStatus.APPROVED)
                .build();
        when(proposalRepository.findById(proposal.getId())).thenReturn(Optional.of(proposal));

        assertThatThrownBy(() -> service.proposeToLender(proposal.getId(), userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("APPROVED");

        verify(proposalRepository, never()).save(any());
    }

    @Test
    void lenderApprove_wrongStartingStatus_throwsBusinessException() {
        RestructureProposal proposal = RestructureProposal.builder()
                .id(UUID.randomUUID())
                .status(RestructureStatus.DRAFT)
                .build();
        when(proposalRepository.findById(proposal.getId())).thenReturn(Optional.of(proposal));

        assertThatThrownBy(() -> service.lenderApprove(proposal.getId(), userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void borrowerAccept_wrongStartingStatus_throwsBusinessException() {
        RestructureProposal proposal = RestructureProposal.builder()
                .id(UUID.randomUUID())
                .status(RestructureStatus.PROPOSED_TO_LENDER)
                .build();
        when(proposalRepository.findById(proposal.getId())).thenReturn(Optional.of(proposal));

        assertThatThrownBy(() -> service.borrowerAccept(proposal.getId(), new RestructureBorrowerAcceptRequest()))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(proposalRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
