package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateSettlementOfferRequest;
import com.recoverpro.server.dto.request.SettlementBorrowerAcceptRequest;
import com.recoverpro.server.dto.request.SettlementMarkPaidRequest;
import com.recoverpro.server.dto.request.SettlementRejectRequest;
import com.recoverpro.server.dto.response.SettlementOfferResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.SettlementAuditLog;
import com.recoverpro.server.entity.SettlementOffer;
import com.recoverpro.server.enums.SettlementOfferStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.SettlementAuditLogRepository;
import com.recoverpro.server.repository.SettlementOfferRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.SettlementOfferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Settlement offer workflow: DRAFT/COMPLIANCE_REVIEW -> APPROVED -> PROPOSED -> ACCEPTED
 * -> PAID, with REJECTED reachable from any non-terminal state and EXPIRED reachable from
 * PROPOSED via the scheduled sweep. See
 * docs/superpowers/specs/2026-08-04-settlement-offers-design.md for the full design.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SettlementOfferServiceImpl implements SettlementOfferService {

    private static final Set<SettlementOfferStatus> NON_TERMINAL = EnumSet.of(
            SettlementOfferStatus.DRAFT, SettlementOfferStatus.COMPLIANCE_REVIEW,
            SettlementOfferStatus.APPROVED, SettlementOfferStatus.PROPOSED);
    private static final Set<SettlementOfferStatus> APPROVABLE = EnumSet.of(
            SettlementOfferStatus.DRAFT, SettlementOfferStatus.COMPLIANCE_REVIEW);

    private final SettlementOfferRepository offerRepository;
    private final SettlementAuditLogRepository auditLogRepository;
    private final AllocationRepository allocationRepository;
    private final OrgIsolationGuard orgIsolationGuard;

    @Value("${app.settlement.compliance-review-discount-threshold-pct:30}")
    private BigDecimal complianceReviewThresholdPct;

    @Override
    public SettlementOfferResponse draft(CreateSettlementOfferRequest request, UUID draftedByUserId) {
        Allocation allocation = allocationRepository.findByIdAndIsDeletedFalse(request.getAllocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Allocation", request.getAllocationId()));
        if (!orgIsolationGuard.belongsToOrg(allocation.getOrganization().getId())) {
            throw new ResourceNotFoundException("Allocation", request.getAllocationId());
        }

        BigDecimal outstanding = allocation.getOutstandingAmount() != null
                ? allocation.getOutstandingAmount() : allocation.getTotalDue();
        if (outstanding == null || outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Allocation has no outstanding balance to offer a settlement against");
        }
        if (request.getOfferedAmount().compareTo(outstanding) > 0) {
            throw new BusinessException("Offered amount cannot exceed the outstanding balance");
        }

        BigDecimal discountPct = outstanding.subtract(request.getOfferedAmount())
                .divide(outstanding, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
        boolean complianceRequired = discountPct.compareTo(complianceReviewThresholdPct) > 0;

        SettlementOffer offer = SettlementOffer.builder()
                .organizationId(allocation.getOrganization().getId())
                .allocationId(allocation.getId())
                .borrowerId(allocation.getBorrowerId())
                .outstandingAtOffer(outstanding)
                .offeredAmount(request.getOfferedAmount())
                .discountPct(discountPct)
                .tenorDays(request.getTenorDays())
                .validityUntil(request.getValidityUntil())
                .conditions(request.getConditions())
                .status(complianceRequired ? SettlementOfferStatus.COMPLIANCE_REVIEW : SettlementOfferStatus.DRAFT)
                .draftedByUserId(draftedByUserId)
                .complianceReviewRequired(complianceRequired)
                .build();

        SettlementOffer saved = offerRepository.save(offer);
        writeAudit(saved, "DRAFTED", draftedByUserId, null, saved.getStatus(),
                "discount=" + discountPct + "%" + (complianceRequired ? " (compliance review required)" : ""));
        log.info("Settlement offer drafted: id={}, allocation={}, discountPct={}",
                saved.getId(), allocation.getId(), discountPct);
        return toResponse(saved);
    }

    @Override
    public SettlementOfferResponse approve(UUID id, UUID actingUserId, boolean actingUserIsOrgLevel) {
        SettlementOffer offer = requireById(id);
        requireOneOf(offer, APPROVABLE);
        if (Boolean.TRUE.equals(offer.getComplianceReviewRequired()) && !actingUserIsOrgLevel) {
            throw new BusinessException(
                    "This offer's discount requires compliance review -- only an org admin or platform admin can approve it");
        }

        SettlementOfferStatus previous = offer.getStatus();
        offer.setStatus(SettlementOfferStatus.APPROVED);
        offer.setApprovedByUserId(actingUserId);
        offer.setApprovedAt(Instant.now());
        if (Boolean.TRUE.equals(offer.getComplianceReviewRequired())) {
            offer.setComplianceReviewedByUserId(actingUserId);
            offer.setComplianceReviewedAt(Instant.now());
        }
        SettlementOffer saved = offerRepository.save(offer);
        writeAudit(saved, "APPROVED", actingUserId, previous, saved.getStatus(), null);
        log.info("Settlement offer approved: id={}, by={}", id, actingUserId);
        return toResponse(saved);
    }

    @Override
    public SettlementOfferResponse reject(UUID id, SettlementRejectRequest request, UUID actingUserId) {
        SettlementOffer offer = requireById(id);
        requireOneOf(offer, NON_TERMINAL);

        SettlementOfferStatus previous = offer.getStatus();
        offer.setStatus(SettlementOfferStatus.REJECTED);
        offer.setRejectedByUserId(actingUserId);
        offer.setRejectedAt(Instant.now());
        offer.setRejectionReason(request.getReason());
        SettlementOffer saved = offerRepository.save(offer);
        writeAudit(saved, "REJECTED", actingUserId, previous, saved.getStatus(), request.getReason());
        log.info("Settlement offer rejected: id={}, by={}, reason={}", id, actingUserId, request.getReason());
        return toResponse(saved);
    }

    @Override
    public SettlementOfferResponse propose(UUID id, UUID actingUserId) {
        SettlementOffer offer = requireById(id);
        requireStatus(offer, SettlementOfferStatus.APPROVED);

        offer.setStatus(SettlementOfferStatus.PROPOSED);
        offer.setProposedByUserId(actingUserId);
        offer.setProposedAt(Instant.now());
        SettlementOffer saved = offerRepository.save(offer);
        writeAudit(saved, "PROPOSED", actingUserId, SettlementOfferStatus.APPROVED, saved.getStatus(), null);
        log.info("Settlement offer proposed to borrower: id={}, by={}", id, actingUserId);
        return toResponse(saved);
    }

    @Override
    public SettlementOfferResponse borrowerAccept(UUID id, SettlementBorrowerAcceptRequest request, UUID actingUserId) {
        SettlementOffer offer = requireById(id);
        requireStatus(offer, SettlementOfferStatus.PROPOSED);

        offer.setStatus(SettlementOfferStatus.ACCEPTED);
        offer.setAcceptedAt(Instant.now());
        offer.setBorrowerConsentArtifactId(request.getBorrowerConsentArtifactId());
        SettlementOffer saved = offerRepository.save(offer);
        writeAudit(saved, "BORROWER_ACCEPTED", actingUserId, SettlementOfferStatus.PROPOSED, saved.getStatus(), null);
        log.info("Settlement offer accepted by borrower: id={}", id);
        return toResponse(saved);
    }

    @Override
    public SettlementOfferResponse markPaid(UUID id, SettlementMarkPaidRequest request, UUID actingUserId) {
        SettlementOffer offer = requireById(id);
        requireStatus(offer, SettlementOfferStatus.ACCEPTED);

        offer.setStatus(SettlementOfferStatus.PAID);
        offer.setPaidAt(Instant.now());
        offer.setPaymentIntentId(request.getPaymentIntentId());
        SettlementOffer saved = offerRepository.save(offer);
        writeAudit(saved, "MARKED_PAID", actingUserId, SettlementOfferStatus.ACCEPTED, saved.getStatus(), null);
        log.info("Settlement offer marked paid: id={}, by={}", id, actingUserId);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SettlementOfferResponse getById(UUID id) {
        return toResponse(requireById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SettlementOfferResponse> getByAllocationId(UUID allocationId) {
        return offerRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SettlementOfferResponse> getByOrganization(
            UUID organizationId, SettlementOfferStatus status, Pageable pageable) {
        Page<SettlementOffer> page = status == null
                ? offerRepository.findByOrganizationId(organizationId, pageable)
                : offerRepository.findByOrganizationIdAndStatus(organizationId, status, pageable);
        return page.map(this::toResponse);
    }

    @Override
    public int expireOverdueOffers() {
        List<SettlementOffer> overdue = offerRepository
                .findByStatusAndValidityUntilBefore(SettlementOfferStatus.PROPOSED, Instant.now());
        for (SettlementOffer offer : overdue) {
            offer.setStatus(SettlementOfferStatus.EXPIRED);
            offerRepository.save(offer);
            writeAudit(offer, "EXPIRED", null, SettlementOfferStatus.PROPOSED, SettlementOfferStatus.EXPIRED,
                    "validityUntil passed without borrower acceptance");
        }
        return overdue.size();
    }

    private SettlementOffer requireById(UUID id) {
        SettlementOffer offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SettlementOffer", id));
        if (!orgIsolationGuard.belongsToOrg(offer.getOrganizationId())) {
            throw new ResourceNotFoundException("SettlementOffer", id);
        }
        return offer;
    }

    private void requireStatus(SettlementOffer offer, SettlementOfferStatus expected) {
        if (offer.getStatus() != expected) {
            throw new BusinessException(
                    "Settlement offer %s is in status %s, expected %s"
                            .formatted(offer.getId(), offer.getStatus(), expected));
        }
    }

    private void requireOneOf(SettlementOffer offer, Set<SettlementOfferStatus> allowed) {
        if (!allowed.contains(offer.getStatus())) {
            throw new BusinessException(
                    "Settlement offer %s is in status %s, which does not allow this action"
                            .formatted(offer.getId(), offer.getStatus()));
        }
    }

    private void writeAudit(SettlementOffer offer, String action, UUID performedBy,
                             SettlementOfferStatus previousStatus, SettlementOfferStatus newStatus, String remarks) {
        auditLogRepository.save(SettlementAuditLog.builder()
                .settlementOfferId(offer.getId())
                .allocationId(offer.getAllocationId())
                .action(action)
                .performedBy(performedBy)
                .previousStatus(previousStatus != null ? previousStatus.name() : null)
                .newStatus(newStatus != null ? newStatus.name() : null)
                .remarks(remarks)
                .build());
    }

    private SettlementOfferResponse toResponse(SettlementOffer o) {
        return SettlementOfferResponse.builder()
                .id(o.getId())
                .organizationId(o.getOrganizationId())
                .allocationId(o.getAllocationId())
                .borrowerId(o.getBorrowerId())
                .outstandingAtOffer(o.getOutstandingAtOffer())
                .offeredAmount(o.getOfferedAmount())
                .discountPct(o.getDiscountPct())
                .tenorDays(o.getTenorDays())
                .validityUntil(o.getValidityUntil())
                .conditions(o.getConditions())
                .status(o.getStatus())
                .draftedByUserId(o.getDraftedByUserId())
                .proposedByUserId(o.getProposedByUserId())
                .proposedAt(o.getProposedAt())
                .approvedByUserId(o.getApprovedByUserId())
                .approvedAt(o.getApprovedAt())
                .rejectedByUserId(o.getRejectedByUserId())
                .rejectedAt(o.getRejectedAt())
                .rejectionReason(o.getRejectionReason())
                .complianceReviewRequired(o.getComplianceReviewRequired())
                .complianceReviewedByUserId(o.getComplianceReviewedByUserId())
                .complianceReviewedAt(o.getComplianceReviewedAt())
                .acceptedAt(o.getAcceptedAt())
                .borrowerConsentArtifactId(o.getBorrowerConsentArtifactId())
                .paidAt(o.getPaidAt())
                .paymentIntentId(o.getPaymentIntentId())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}
