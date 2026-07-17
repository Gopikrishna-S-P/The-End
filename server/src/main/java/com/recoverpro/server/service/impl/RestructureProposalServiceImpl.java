package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateRestructureProposalRequest;
import com.recoverpro.server.dto.request.RestructureBorrowerAcceptRequest;
import com.recoverpro.server.dto.request.RestructureRejectRequest;
import com.recoverpro.server.dto.response.RestructureProposalResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.RestructureProposal;
import com.recoverpro.server.enums.RestructureStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.RestructureProposalRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.RestructureProposalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * EMI restructure proposal workflow: DRAFT -> PROPOSED_TO_LENDER -> APPROVED
 * -> ACCEPTED. Lender rejection is a branch from PROPOSED_TO_LENDER.
 *
 * ACCEPTED -> ACTIVE is intentionally not implemented -- it requires closing
 * the old Allocation as RESTRUCTURED and creating a new one with
 * restructured_from_id, which is a broader AllocationService change tracked
 * separately. ACCEPTED is this service's practical terminal state.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RestructureProposalServiceImpl implements RestructureProposalService {

    private final RestructureProposalRepository proposalRepository;
    private final AllocationRepository allocationRepository;
    private final OrgIsolationGuard orgIsolationGuard;

    @Override
    public RestructureProposalResponse draft(CreateRestructureProposalRequest request, UUID draftedByUserId) {
        Allocation allocation = allocationRepository.findByIdAndIsDeletedFalse(request.getAllocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Allocation", request.getAllocationId()));
        if (!orgIsolationGuard.belongsToOrg(allocation.getOrganization().getId())) {
            throw new ResourceNotFoundException("Allocation", request.getAllocationId());
        }

        RestructureProposal proposal = RestructureProposal.builder()
                .organizationId(allocation.getOrganization().getId())
                .allocationId(allocation.getId())
                .borrowerId(allocation.getBorrowerId())
                .originalEmiCount(request.getOriginalEmiCount())
                .originalEmiAmount(request.getOriginalEmiAmount())
                .originalApr(request.getOriginalApr())
                .newEmiCount(request.getNewEmiCount())
                .newEmiAmount(request.getNewEmiAmount())
                .newApr(request.getNewApr())
                .stepSchedule(request.getStepSchedule())
                .rationale(request.getRationale())
                .status(RestructureStatus.DRAFT)
                .draftedByUserId(draftedByUserId)
                .build();

        RestructureProposal saved = proposalRepository.save(proposal);
        log.info("Restructure proposal drafted: id={}, allocation={}", saved.getId(), allocation.getId());
        return toResponse(saved);
    }

    @Override
    public RestructureProposalResponse proposeToLender(UUID id, UUID actingUserId) {
        RestructureProposal proposal = requireById(id);
        requireStatus(proposal, RestructureStatus.DRAFT);

        proposal.setStatus(RestructureStatus.PROPOSED_TO_LENDER);
        proposal.setProposedToLenderAt(Instant.now());
        RestructureProposal saved = proposalRepository.save(proposal);
        log.info("Restructure proposal sent to lender: id={}, by={}", id, actingUserId);
        return toResponse(saved);
    }

    @Override
    public RestructureProposalResponse lenderApprove(UUID id, UUID actingUserId) {
        RestructureProposal proposal = requireById(id);
        requireStatus(proposal, RestructureStatus.PROPOSED_TO_LENDER);

        proposal.setStatus(RestructureStatus.APPROVED);
        proposal.setLenderApprovalUserId(actingUserId);
        proposal.setLenderApprovalAt(Instant.now());
        RestructureProposal saved = proposalRepository.save(proposal);
        log.info("Restructure proposal approved by lender: id={}, by={}", id, actingUserId);
        return toResponse(saved);
    }

    @Override
    public RestructureProposalResponse lenderReject(UUID id, RestructureRejectRequest request, UUID actingUserId) {
        RestructureProposal proposal = requireById(id);
        requireStatus(proposal, RestructureStatus.PROPOSED_TO_LENDER);

        proposal.setStatus(RestructureStatus.REJECTED);
        proposal.setRejectedByUserId(actingUserId);
        proposal.setRejectedAt(Instant.now());
        proposal.setRejectionReason(request.getReason());
        RestructureProposal saved = proposalRepository.save(proposal);
        log.info("Restructure proposal rejected by lender: id={}, by={}, reason={}",
                id, actingUserId, request.getReason());
        return toResponse(saved);
    }

    @Override
    public RestructureProposalResponse borrowerAccept(UUID id, RestructureBorrowerAcceptRequest request) {
        RestructureProposal proposal = requireById(id);
        requireStatus(proposal, RestructureStatus.APPROVED);

        proposal.setStatus(RestructureStatus.ACCEPTED);
        proposal.setBorrowerAcceptedAt(Instant.now());
        proposal.setBorrowerConsentArtifactId(request.getBorrowerConsentArtifactId());
        RestructureProposal saved = proposalRepository.save(proposal);
        log.info("Restructure proposal accepted by borrower: id={}", id);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public RestructureProposalResponse getById(UUID id) {
        return toResponse(requireById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RestructureProposalResponse> getByAllocationId(UUID allocationId) {
        return proposalRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RestructureProposalResponse> getByOrganization(
            UUID organizationId, RestructureStatus status, Pageable pageable) {
        Page<RestructureProposal> page = status == null
                ? proposalRepository.findByOrganizationId(organizationId, pageable)
                : proposalRepository.findByOrganizationIdAndStatus(organizationId, status, pageable);
        return page.map(this::toResponse);
    }

    private RestructureProposal requireById(UUID id) {
        RestructureProposal proposal = proposalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RestructureProposal", id));
        if (!orgIsolationGuard.belongsToOrg(proposal.getOrganizationId())) {
            throw new ResourceNotFoundException("RestructureProposal", id);
        }
        return proposal;
    }

    private void requireStatus(RestructureProposal proposal, RestructureStatus expected) {
        if (proposal.getStatus() != expected) {
            throw new BusinessException(
                    "Restructure proposal %s is in status %s, expected %s"
                            .formatted(proposal.getId(), proposal.getStatus(), expected));
        }
    }

    private RestructureProposalResponse toResponse(RestructureProposal p) {
        return RestructureProposalResponse.builder()
                .id(p.getId())
                .organizationId(p.getOrganizationId())
                .allocationId(p.getAllocationId())
                .borrowerId(p.getBorrowerId())
                .originalEmiCount(p.getOriginalEmiCount())
                .originalEmiAmount(p.getOriginalEmiAmount())
                .originalApr(p.getOriginalApr())
                .newEmiCount(p.getNewEmiCount())
                .newEmiAmount(p.getNewEmiAmount())
                .newApr(p.getNewApr())
                .stepSchedule(p.getStepSchedule())
                .rationale(p.getRationale())
                .status(p.getStatus())
                .draftedByUserId(p.getDraftedByUserId())
                .proposedToLenderAt(p.getProposedToLenderAt())
                .lenderApprovalUserId(p.getLenderApprovalUserId())
                .lenderApprovalAt(p.getLenderApprovalAt())
                .borrowerAcceptedAt(p.getBorrowerAcceptedAt())
                .borrowerConsentArtifactId(p.getBorrowerConsentArtifactId())
                .newAllocationId(p.getNewAllocationId())
                .rejectedByUserId(p.getRejectedByUserId())
                .rejectedAt(p.getRejectedAt())
                .rejectionReason(p.getRejectionReason())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
