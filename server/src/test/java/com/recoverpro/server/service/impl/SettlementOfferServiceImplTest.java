package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateSettlementOfferRequest;
import com.recoverpro.server.dto.request.SettlementBorrowerAcceptRequest;
import com.recoverpro.server.dto.request.SettlementMarkPaidRequest;
import com.recoverpro.server.dto.request.SettlementRejectRequest;
import com.recoverpro.server.dto.response.SettlementOfferResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.SettlementAuditLog;
import com.recoverpro.server.entity.SettlementOffer;
import com.recoverpro.server.enums.SettlementOfferStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.SettlementAuditLogRepository;
import com.recoverpro.server.repository.SettlementOfferRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SettlementOfferServiceImplTest {

    @Mock private SettlementOfferRepository offerRepository;
    @Mock private SettlementAuditLogRepository auditLogRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private SettlementOfferServiceImpl service;

    private UUID orgId;
    private UUID allocationId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new SettlementOfferServiceImpl(offerRepository, auditLogRepository, allocationRepository, orgIsolationGuard);
        try {
            var field = SettlementOfferServiceImpl.class.getDeclaredField("complianceReviewThresholdPct");
            field.setAccessible(true);
            field.set(service, new BigDecimal("30"));
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        lenient().when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        orgId = UUID.randomUUID();
        allocationId = UUID.randomUUID();
        userId = UUID.randomUUID();
        lenient().when(offerRepository.save(any(SettlementOffer.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(auditLogRepository.save(any(SettlementAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Allocation allocationFixture(BigDecimal outstanding) {
        Organization org = new Organization();
        org.setId(orgId);
        return Allocation.builder()
                .id(allocationId)
                .organization(org)
                .borrowerId(UUID.randomUUID())
                .outstandingAmount(outstanding)
                .isDeleted(false)
                .build();
    }

    private CreateSettlementOfferRequest draftRequest(BigDecimal offeredAmount) {
        CreateSettlementOfferRequest request = new CreateSettlementOfferRequest();
        request.setAllocationId(allocationId);
        request.setOfferedAmount(offeredAmount);
        request.setTenorDays(30);
        request.setValidityUntil(Instant.now().plus(14, ChronoUnit.DAYS));
        request.setConditions("Full and final settlement");
        return request;
    }

    @Test
    void draft_lowDiscount_createsInDraftStatus() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId))
                .thenReturn(Optional.of(allocationFixture(new BigDecimal("10000.00"))));

        SettlementOfferResponse response = service.draft(draftRequest(new BigDecimal("9000.00")), userId);

        assertThat(response.getStatus()).isEqualTo(SettlementOfferStatus.DRAFT);
        assertThat(response.getComplianceReviewRequired()).isFalse();
        assertThat(response.getDiscountPct()).isEqualByComparingTo("10.00");
        assertThat(response.getOrganizationId()).isEqualTo(orgId);
    }

    @Test
    void draft_highDiscount_createsInPendingComplianceReview() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId))
                .thenReturn(Optional.of(allocationFixture(new BigDecimal("10000.00"))));

        SettlementOfferResponse response = service.draft(draftRequest(new BigDecimal("5000.00")), userId);

        assertThat(response.getStatus()).isEqualTo(SettlementOfferStatus.COMPLIANCE_REVIEW);
        assertThat(response.getComplianceReviewRequired()).isTrue();
        assertThat(response.getDiscountPct()).isEqualByComparingTo("50.00");
    }

    @Test
    void draft_offeredAmountExceedsOutstanding_throws() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId))
                .thenReturn(Optional.of(allocationFixture(new BigDecimal("1000.00"))));

        assertThatThrownBy(() -> service.draft(draftRequest(new BigDecimal("2000.00")), userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void draft_allocationNotFound_throws() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.draft(draftRequest(new BigDecimal("500.00")), userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void approve_complianceRequired_blockedForNonOrgLevelCaller() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).organizationId(orgId)
                .status(SettlementOfferStatus.COMPLIANCE_REVIEW)
                .complianceReviewRequired(true)
                .build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        assertThatThrownBy(() -> service.approve(offer.getId(), userId, false))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("compliance review");
        verify(offerRepository, never()).save(any());
    }

    @Test
    void approve_complianceRequired_allowedForOrgLevelCaller() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).organizationId(orgId)
                .status(SettlementOfferStatus.COMPLIANCE_REVIEW)
                .complianceReviewRequired(true)
                .build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        SettlementOfferResponse response = service.approve(offer.getId(), userId, true);

        assertThat(response.getStatus()).isEqualTo(SettlementOfferStatus.APPROVED);
        assertThat(response.getComplianceReviewedByUserId()).isEqualTo(userId);
    }

    @Test
    void fullLifecycle_draftToPaid() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).organizationId(orgId).allocationId(allocationId)
                .status(SettlementOfferStatus.DRAFT).complianceReviewRequired(false)
                .draftedByUserId(userId)
                .build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        SettlementOfferResponse afterApprove = service.approve(offer.getId(), userId, false);
        assertThat(afterApprove.getStatus()).isEqualTo(SettlementOfferStatus.APPROVED);

        SettlementOfferResponse afterPropose = service.propose(offer.getId(), userId);
        assertThat(afterPropose.getStatus()).isEqualTo(SettlementOfferStatus.PROPOSED);
        assertThat(afterPropose.getProposedAt()).isNotNull();

        UUID consentId = UUID.randomUUID();
        SettlementBorrowerAcceptRequest acceptRequest = new SettlementBorrowerAcceptRequest();
        acceptRequest.setBorrowerConsentArtifactId(consentId);
        SettlementOfferResponse afterAccept = service.borrowerAccept(offer.getId(), acceptRequest, userId);
        assertThat(afterAccept.getStatus()).isEqualTo(SettlementOfferStatus.ACCEPTED);
        assertThat(afterAccept.getBorrowerConsentArtifactId()).isEqualTo(consentId);

        UUID paymentIntentId = UUID.randomUUID();
        SettlementMarkPaidRequest paidRequest = new SettlementMarkPaidRequest();
        paidRequest.setPaymentIntentId(paymentIntentId);
        SettlementOfferResponse afterPaid = service.markPaid(offer.getId(), paidRequest, userId);
        assertThat(afterPaid.getStatus()).isEqualTo(SettlementOfferStatus.PAID);
        assertThat(afterPaid.getPaymentIntentId()).isEqualTo(paymentIntentId);

        verify(auditLogRepository, times(4)).save(any(SettlementAuditLog.class));
    }

    @Test
    void reject_fromApproved_allowed() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).organizationId(orgId)
                .status(SettlementOfferStatus.APPROVED)
                .build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        SettlementRejectRequest reject = new SettlementRejectRequest();
        reject.setReason("Borrower situation changed");
        SettlementOfferResponse response = service.reject(offer.getId(), reject, userId);

        assertThat(response.getStatus()).isEqualTo(SettlementOfferStatus.REJECTED);
        assertThat(response.getRejectionReason()).isEqualTo("Borrower situation changed");
    }

    @Test
    void reject_fromPaid_throwsBusinessException() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).organizationId(orgId)
                .status(SettlementOfferStatus.PAID)
                .build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        SettlementRejectRequest reject = new SettlementRejectRequest();
        reject.setReason("too late");
        assertThatThrownBy(() -> service.reject(offer.getId(), reject, userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void propose_wrongStartingStatus_throwsBusinessException() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).status(SettlementOfferStatus.DRAFT).build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        assertThatThrownBy(() -> service.propose(offer.getId(), userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void expireOverdueOffers_flipsProposedPastValidityToExpired() {
        SettlementOffer overdue = SettlementOffer.builder()
                .id(UUID.randomUUID()).allocationId(allocationId)
                .status(SettlementOfferStatus.PROPOSED)
                .validityUntil(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();
        when(offerRepository.findByStatusAndValidityUntilBefore(eq(SettlementOfferStatus.PROPOSED), any()))
                .thenReturn(List.of(overdue));

        int count = service.expireOverdueOffers();

        assertThat(count).isEqualTo(1);
        assertThat(overdue.getStatus()).isEqualTo(SettlementOfferStatus.EXPIRED);
        verify(offerRepository).save(overdue);
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(offerRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
