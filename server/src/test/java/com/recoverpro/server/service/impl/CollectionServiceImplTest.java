package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.ApprovalRequest;
import com.recoverpro.server.dto.request.DepositRequest;
import com.recoverpro.server.dto.response.CollectionResponse;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.enums.ApprovalAction;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import com.recoverpro.server.mapper.CollectionMapper;
import com.recoverpro.server.observability.BusinessMetrics;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.CollectionAuditLogRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.CollectionLedgerService;
import com.recoverpro.server.service.DocumentService;
import com.recoverpro.server.service.ReceiptNumberGenerator;
import com.recoverpro.server.service.VisitLogService;
import com.recoverpro.server.service.compliance.CashHandlingGuard;
import com.recoverpro.server.service.compliance.ComplianceAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers only the new CollectionLedgerService wiring added to approve/deposit/cancel.
 * Pre-existing submit/report/list behavior is unchanged and untested here.
 */
@ExtendWith(MockitoExtension.class)
class CollectionServiceImplTest {

    @Mock private CollectionRepository collectionRepository;
    @Mock private CollectionAuditLogRepository auditLogRepository;
    @Mock private CollectionMapper collectionMapper;
    @Mock private ReceiptNumberGenerator receiptNumberGenerator;
    @Mock private DocumentService documentService;
    @Mock private VisitLogService visitLogService;
    @Mock private AllocationRepository allocationRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;
    @Mock private BusinessMetrics metrics;
    @Mock private CollectionLedgerService collectionLedgerService;
    @Mock private ComplianceAuditService complianceAuditService;

    private CollectionServiceImpl service;
    private UUID orgId;
    private UUID approverId;

    @BeforeEach
    void setUp() {
        service = new CollectionServiceImpl(
                collectionRepository, auditLogRepository, collectionMapper, receiptNumberGenerator,
                documentService, visitLogService, allocationRepository, userRepository,
                new CashHandlingGuard(complianceAuditService), orgIsolationGuard, metrics, collectionLedgerService);

        orgId = UUID.randomUUID();
        approverId = UUID.randomUUID();

        lenient().when(collectionMapper.toResponse(any(Collection.class)))
                .thenReturn(CollectionResponse.builder().build());
        lenient().when(documentService.getDocumentsByCollection(any())).thenReturn(List.of());
        lenient().when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        lenient().when(collectionRepository.save(any(Collection.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Collection pendingCollection(UUID submittedBy) {
        return Collection.builder()
                .id(UUID.randomUUID())
                .allocationId(UUID.randomUUID())
                .organizationId(orgId)
                .submittedBy(submittedBy)
                .amount(new BigDecimal("1000.00"))
                .paymentMode(PaymentMode.NEFT)
                .status(CollectionStatus.PENDING_APPROVAL)
                .build();
    }

    @Test
    void approve_recordsLedgerApproval() {
        UUID submittedBy = UUID.randomUUID();
        Collection collection = pendingCollection(submittedBy);
        when(collectionRepository.findByIdAndIsDeletedFalse(collection.getId()))
                .thenReturn(Optional.of(collection));
        when(documentService.getDocumentCount(collection.getId())).thenReturn(1);
        when(receiptNumberGenerator.generate(orgId)).thenReturn("RCP-TEST-0001");

        ApprovalRequest request = new ApprovalRequest();
        request.setAction(ApprovalAction.APPROVE);

        service.approve(collection.getId(), request, approverId);

        verify(collectionLedgerService).recordApproval(collection, approverId);
        verify(collectionLedgerService, never()).recordDeposit(any(), any());
        verify(collectionLedgerService, never()).recordReversal(any(), any(), any());
    }

    @Test
    void approve_rejectionDoesNotRecordLedgerEntry() {
        UUID submittedBy = UUID.randomUUID();
        Collection collection = pendingCollection(submittedBy);
        when(collectionRepository.findByIdAndIsDeletedFalse(collection.getId()))
                .thenReturn(Optional.of(collection));
        when(documentService.getDocumentCount(collection.getId())).thenReturn(1);

        ApprovalRequest request = new ApprovalRequest();
        request.setAction(ApprovalAction.REJECT);
        request.setRemarks("missing proof");

        service.approve(collection.getId(), request, approverId);

        verifyNoInteractions(collectionLedgerService);
    }

    @Test
    void markDeposited_recordsLedgerDeposit() {
        Collection collection = pendingCollection(UUID.randomUUID());
        collection.setStatus(CollectionStatus.APPROVED);
        when(collectionRepository.findByIdAndIsDeletedFalse(collection.getId()))
                .thenReturn(Optional.of(collection));

        UUID depositedBy = UUID.randomUUID();
        service.markDeposited(collection.getId(), new DepositRequest(), depositedBy);

        verify(collectionLedgerService).recordDeposit(collection, depositedBy);
    }

    @Test
    void cancelCollection_previouslyApproved_recordsLedgerReversal() {
        Collection collection = pendingCollection(UUID.randomUUID());
        collection.setStatus(CollectionStatus.APPROVED);
        when(collectionRepository.findByIdAndIsDeletedFalse(collection.getId()))
                .thenReturn(Optional.of(collection));

        UUID cancelledBy = UUID.randomUUID();
        service.cancelCollection(collection.getId(), cancelledBy);

        verify(collectionLedgerService).recordReversal(collection, cancelledBy, "Cancelled after approval");
        assertThat(collection.getStatus()).isEqualTo(CollectionStatus.CANCELLED);
    }

    @Test
    void cancelCollection_stillPending_doesNotRecordReversal() {
        Collection collection = pendingCollection(UUID.randomUUID());
        when(collectionRepository.findByIdAndIsDeletedFalse(collection.getId()))
                .thenReturn(Optional.of(collection));

        service.cancelCollection(collection.getId(), UUID.randomUUID());

        verifyNoInteractions(collectionLedgerService);
    }

    @Test
    void getByAllocationIds_batchesDocumentLookup_insteadOfPerAllocation() {
        UUID alloc1 = UUID.randomUUID();
        UUID alloc2 = UUID.randomUUID();
        Collection c1 = Collection.builder().id(UUID.randomUUID()).allocationId(alloc1)
                .organizationId(orgId).amount(new BigDecimal("1000.00"))
                .paymentMode(PaymentMode.NEFT).status(CollectionStatus.PENDING_APPROVAL).build();
        Collection c2 = Collection.builder().id(UUID.randomUUID()).allocationId(alloc2)
                .organizationId(orgId).amount(new BigDecimal("2000.00"))
                .paymentMode(PaymentMode.NEFT).status(CollectionStatus.PENDING_APPROVAL).build();

        when(collectionRepository.findAllByAllocationIdsOrdered(List.of(alloc1, alloc2)))
                .thenReturn(List.of(c1, c2));
        when(documentService.getDocumentsByCollectionIds(List.of(c1.getId(), c2.getId())))
                .thenReturn(java.util.Map.of());

        List<CollectionResponse> result = service.getByAllocationIds(List.of(alloc1, alloc2));

        assertThat(result).hasSize(2);
        verify(documentService, times(1)).getDocumentsByCollectionIds(any());
        verify(documentService, never()).getDocumentsByCollection(any());
        verify(collectionRepository, never()).findByAllocationIdAndIsDeletedFalseOrderByCreatedAtDesc(any());
    }
}
