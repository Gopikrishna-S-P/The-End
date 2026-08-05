package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.ApprovalRequest;
import com.recoverpro.server.dto.request.DepositRequest;
import com.recoverpro.server.dto.request.SubmitCollectionRequest;
import com.recoverpro.server.dto.response.AgentCollectionReport;
import com.recoverpro.server.dto.response.CollectionDocumentResponse;
import com.recoverpro.server.dto.response.CollectionResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.CollectionAuditLog;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.VisitLog;
import com.recoverpro.server.enums.ApprovalAction;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.exception.SelfApprovalException;
import com.recoverpro.server.mapper.CollectionMapper;
import com.recoverpro.server.observability.BusinessMetrics;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.CollectionAuditLogRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.CollectionLedgerService;
import com.recoverpro.server.service.CollectionService;
import com.recoverpro.server.service.DocumentService;
import com.recoverpro.server.service.ReceiptNumberGenerator;
import com.recoverpro.server.service.VisitLogService;
import com.recoverpro.server.service.compliance.CashHandlingGuard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CollectionServiceImpl implements CollectionService {

    private final CollectionRepository collectionRepository;
    private final CollectionAuditLogRepository auditLogRepository;
    private final CollectionMapper collectionMapper;
    private final ReceiptNumberGenerator receiptNumberGenerator;
    private final DocumentService documentService;
    private final VisitLogService visitLogService;
    private final AllocationRepository allocationRepository;
    private final UserRepository userRepository;
    private final CashHandlingGuard cashHandlingGuard;
    private final OrgIsolationGuard orgIsolationGuard;
    private final BusinessMetrics metrics;
    private final CollectionLedgerService collectionLedgerService;

    @Override
    public CollectionResponse submit(SubmitCollectionRequest request, UUID submittedBy) {
        log.info("Submit collection: allocationId={}, amount={}, mode={}, submittedBy={}, visitId={}",
                request.getAllocationId(), request.getAmount(), request.getPaymentMode(),
                submittedBy, request.getVisitId());

        if (collectionRepository.existsByIdempotencyKey(request.getIdempotencyKey())) {
            Collection existing = collectionRepository.findByIdempotencyKey(request.getIdempotencyKey())
                    .orElseThrow();
            log.warn("Idempotent retry: key={}, existing id={}", request.getIdempotencyKey(), existing.getId());
            return buildResponse(existing);
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Collection amount must be greater than zero");
        }
        Allocation alloc = allocationRepository.findByIdAndIsDeletedFalse(request.getAllocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Allocation", request.getAllocationId()));
        if (!orgIsolationGuard.belongsToOrg(alloc.getOrganization().getId())) {
            throw new ResourceNotFoundException("Allocation", request.getAllocationId());
        }
        if (alloc.getOutstandingAmount() != null
                && request.getAmount().compareTo(alloc.getOutstandingAmount()) > 0) {
            throw new BusinessException("Collection amount ₹" + request.getAmount()
                    + " exceeds outstanding balance ₹" + alloc.getOutstandingAmount());
        }

        if (request.getVisitId() != null) {
            VisitLog visitLog = visitLogService.findVisitById(request.getVisitId());
            if (visitLog.getCollectionId() != null) {
                throw new BusinessException("This visit already has a collection linked.");
            }
            if (visitLog.getPtpId() != null) {
                throw new BusinessException(
                        "Cannot submit collection: this visit has a PTP linked. A visit cannot have both PTP and Collection.");
            }
        }

        validatePaymentModeFields(request);
        UUID orgId = alloc.getOrganization().getId();
        cashHandlingGuard.enforceOnSubmit(request.getPaymentMode(), request.isCashHandlingAcknowledged(),
                request.getAllocationId(), orgId, submittedBy);

        if (request.getPaymentMode() == PaymentMode.CASH) {
            BigDecimal todayCash = Objects.requireNonNullElse(
                    collectionRepository.sumCashByAgentAndDate(submittedBy, LocalDate.now()),
                    BigDecimal.ZERO);
            cashHandlingGuard.enforceAgentDailyLimit(request.getAmount(), todayCash,
                    request.getAllocationId(), orgId, submittedBy);
        }

        Collection collection = Collection.builder()
                .allocationId(request.getAllocationId())
                .loanNumber(alloc.getLoanNumber())
                .organizationId(alloc.getOrganization().getId())
                .submittedBy(submittedBy)
                .amount(request.getAmount())
                .paymentMode(request.getPaymentMode())
                .status(CollectionStatus.PENDING_APPROVAL)
                .notes(request.getNotes())
                .idempotencyKey(request.getIdempotencyKey())
                .collectionDate(request.getCollectionDate())
                .chequeNumber(request.getChequeNumber())
                .chequeDate(request.getChequeDate())
                .bankName(request.getBankName())
                .upiReferenceId(request.getUpiReferenceId())
                .transactionReferenceId(request.getTransactionReferenceId())
                .cashHandlingAcknowledged(
                        request.getPaymentMode() == PaymentMode.CASH && request.isCashHandlingAcknowledged())
                .isDeleted(false)
                .build();

        Collection saved = collectionRepository.save(collection);
        metrics.recordCollectionSubmitted(saved.getStatus().name());
        audit(saved.getId(), "SUBMITTED", submittedBy, null, CollectionStatus.PENDING_APPROVAL.name(), null);

        if (request.getVisitId() != null) {
            try {
                visitLogService.linkCollection(request.getVisitId(), saved.getId());
                log.info("Linked collection {} to visit {}", saved.getId(), request.getVisitId());
            } catch (Exception e) {
                log.warn("Failed to link collection to visit {}: {}", request.getVisitId(), e.getMessage());
            }
        }

        log.info("Collection submitted: id={}", saved.getId());
        return buildResponse(saved);
    }

    @Override
    public CollectionResponse approve(UUID collectionId, ApprovalRequest request, UUID approvedBy) {
        log.info("Approval action={} on collectionId={} by userId={}", request.getAction(), collectionId, approvedBy);

        Collection collection = collectionRepository.findByIdAndIsDeletedFalse(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", collectionId));
        if (!orgIsolationGuard.belongsToOrg(collection.getOrganizationId())) {
            throw new ResourceNotFoundException("Collection", collectionId);
        }

        if (collection.getStatus() != CollectionStatus.PENDING_APPROVAL) {
            throw new BusinessException("Collection is not in PENDING_APPROVAL state. Current: " + collection.getStatus());
        }
        if (collection.getSubmittedBy().equals(approvedBy)) {
            throw new SelfApprovalException("Maker-checker violation: cannot approve your own submission");
        }
        if (documentService.getDocumentCount(collectionId) == 0) {
            throw new BusinessException("Payment proof document must be attached before approval");
        }

        String previousStatus = collection.getStatus().name();

        if (request.getAction() == ApprovalAction.APPROVE) {
            String receiptNumber = receiptNumberGenerator.generate(collection.getOrganizationId());
            collection.setStatus(CollectionStatus.APPROVED);
            collection.setApprovedBy(approvedBy);
            collection.setApprovedAt(Instant.now());
            collection.setReceiptNumber(receiptNumber);
            audit(collectionId, "APPROVED", approvedBy, previousStatus, CollectionStatus.APPROVED.name(), request.getRemarks());
            collectionLedgerService.recordApproval(collection, approvedBy);
            log.info("Collection approved: id={}, receipt={}", collectionId, receiptNumber);
        } else {
            if (request.getRemarks() == null || request.getRemarks().isBlank()) {
                throw new BusinessException("Rejection reason is mandatory");
            }
            collection.setStatus(CollectionStatus.REJECTED);
            collection.setRejectionReason(request.getRemarks());
            audit(collectionId, "REJECTED", approvedBy, previousStatus, CollectionStatus.REJECTED.name(), request.getRemarks());
            log.info("Collection rejected: id={}, reason={}", collectionId, request.getRemarks());
        }

        return buildResponse(collectionRepository.save(collection));
    }

    @Override
    public CollectionResponse markDeposited(UUID collectionId, DepositRequest request, UUID depositedBy) {
        log.info("Mark deposited: collectionId={}, depositedBy={}", collectionId, depositedBy);

        Collection collection = collectionRepository.findByIdAndIsDeletedFalse(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", collectionId));
        if (!orgIsolationGuard.belongsToOrg(collection.getOrganizationId())) {
            throw new ResourceNotFoundException("Collection", collectionId);
        }

        if (collection.getStatus() != CollectionStatus.APPROVED) {
            throw new BusinessException("Only APPROVED collections can be marked as deposited. Current: " + collection.getStatus());
        }
        cashHandlingGuard.enforceOnDeposit(collection, depositedBy);

        String previousStatus = collection.getStatus().name();
        collection.setStatus(CollectionStatus.DEPOSITED);
        collection.setDepositedBy(depositedBy);
        collection.setDepositedAt(Instant.now());

        Collection saved = collectionRepository.save(collection);
        audit(collectionId, "DEPOSITED", depositedBy, previousStatus, CollectionStatus.DEPOSITED.name(), request.getNotes());
        collectionLedgerService.recordDeposit(saved, depositedBy);
        log.info("Collection deposited: id={}", collectionId);
        return buildResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CollectionResponse getById(UUID id) {
        Collection collection = collectionRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", id));
        if (!orgIsolationGuard.belongsToOrg(collection.getOrganizationId())) {
            throw new ResourceNotFoundException("Collection", id);
        }
        return buildResponse(collection);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CollectionResponse> getByAllocationId(UUID allocationId) {
        return buildResponses(collectionRepository.findByAllocationIdAndIsDeletedFalseOrderByCreatedAtDesc(allocationId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CollectionResponse> getByAllocationIds(List<UUID> allocationIds) {
        if (allocationIds.isEmpty()) return List.of();
        return buildResponses(collectionRepository.findAllByAllocationIdsOrdered(allocationIds));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CollectionResponse> getCollections(UUID orgId, UUID agentId, CollectionStatus status,
                                                   PaymentMode paymentMode, LocalDate fromDate,
                                                   LocalDate toDate, Pageable pageable) {
        Page<Collection> page = collectionRepository
                .findWithFilters(orgId, agentId, status, paymentMode, fromDate, toDate, pageable);
        return new PageImpl<>(buildResponses(page.getContent()), pageable, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public AgentCollectionReport getDailyReport(UUID agentId, LocalDate date) {
        assertAgentInCallerOrg(agentId);
        return buildReport(agentId, collectionRepository.findByAgentAndDate(agentId, date), date, true);
    }

    @Override
    @Transactional(readOnly = true)
    public AgentCollectionReport getAllTimeReport(UUID agentId) {
        assertAgentInCallerOrg(agentId);
        return buildReport(agentId, collectionRepository.findAllByAgent(agentId), null, false);
    }

    private void assertAgentInCallerOrg(UUID agentId) {
        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
        if (!orgIsolationGuard.belongsToOrg(agent.getOrganizationId())) {
            throw new ResourceNotFoundException("Report not found");
        }
    }

    @Override
    public void cancelCollection(UUID collectionId, UUID cancelledBy) {
        Collection collection = collectionRepository.findByIdAndIsDeletedFalse(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", collectionId));
        if (!orgIsolationGuard.belongsToOrg(collection.getOrganizationId())) {
            throw new ResourceNotFoundException("Collection", collectionId);
        }

        if (collection.getStatus() == CollectionStatus.DEPOSITED) {
            throw new BusinessException("Cannot cancel a deposited collection");
        }
        if (collection.getStatus() == CollectionStatus.CANCELLED) {
            throw new BusinessException("Collection is already cancelled");
        }

        CollectionStatus previousStatus = collection.getStatus();
        collection.setStatus(CollectionStatus.CANCELLED);
        Collection saved = collectionRepository.save(collection);
        audit(collectionId, "CANCELLED", cancelledBy, previousStatus.name(), CollectionStatus.CANCELLED.name(), null);
        if (previousStatus == CollectionStatus.APPROVED) {
            collectionLedgerService.recordReversal(saved, cancelledBy, "Cancelled after approval");
        }
        log.info("Collection cancelled: id={}", collectionId);
    }

    private void validatePaymentModeFields(SubmitCollectionRequest request) {
        switch (request.getPaymentMode()) {
            case CHEQUE -> {
                if (request.getChequeNumber() == null || request.getChequeNumber().isBlank())
                    throw new BusinessException("Cheque number is required for CHEQUE payment mode");
                if (request.getChequeDate() == null)
                    throw new BusinessException("Cheque date is required for CHEQUE payment mode");
                if (request.getBankName() == null || request.getBankName().isBlank())
                    throw new BusinessException("Bank name is required for CHEQUE payment mode");
            }
            case UPI -> {
                if (request.getUpiReferenceId() == null || request.getUpiReferenceId().isBlank())
                    throw new BusinessException("UPI reference ID is required for UPI payment mode");
            }
            case NEFT, RTGS -> {
                if (request.getTransactionReferenceId() == null || request.getTransactionReferenceId().isBlank())
                    throw new BusinessException("Transaction reference ID is required for "
                            + request.getPaymentMode() + " payment mode");
            }
            case CASH -> { /* no extra fields required */ }
        }
    }

    private AgentCollectionReport buildReport(UUID agentId, List<Collection> collections,
                                              LocalDate date, boolean isDaily) {
        Map<PaymentMode, Integer> countByMode = new EnumMap<>(PaymentMode.class);
        Map<PaymentMode, BigDecimal> amountByMode = new EnumMap<>(PaymentMode.class);
        Map<CollectionStatus, Integer> countByStatus = new EnumMap<>(CollectionStatus.class);

        BigDecimal totalSubmitted = BigDecimal.ZERO;
        BigDecimal totalApproved  = BigDecimal.ZERO;
        BigDecimal totalDeposited = BigDecimal.ZERO;
        int approved = 0, rejected = 0, deposited = 0, pending = 0;

        for (Collection c : collections) {
            countByMode.merge(c.getPaymentMode(), 1, Integer::sum);
            amountByMode.merge(c.getPaymentMode(), c.getAmount(), BigDecimal::add);
            countByStatus.merge(c.getStatus(), 1, Integer::sum);
            totalSubmitted = totalSubmitted.add(c.getAmount());
            switch (c.getStatus()) {
                case APPROVED  -> { totalApproved  = totalApproved.add(c.getAmount());  approved++; }
                case DEPOSITED -> { totalDeposited = totalDeposited.add(c.getAmount()); deposited++; }
                case REJECTED  -> rejected++;
                case PENDING_APPROVAL -> pending++;
                default -> { }
            }
        }

        return AgentCollectionReport.builder()
                .agentId(agentId)
                .reportDate(date)
                .isDailyReport(isDaily)
                .totalSubmissions(collections.size())
                .totalApproved(approved)
                .totalRejected(rejected)
                .totalDeposited(deposited)
                .totalPending(pending)
                .totalAmountSubmitted(totalSubmitted)
                .totalAmountApproved(totalApproved)
                .totalAmountDeposited(totalDeposited)
                .countByPaymentMode(countByMode)
                .amountByPaymentMode(amountByMode)
                .countByStatus(countByStatus)
                .build();
    }

    private CollectionResponse buildResponse(Collection collection) {
        CollectionResponse response = collectionMapper.toResponse(collection);
        List<CollectionDocumentResponse> docs = documentService.getDocumentsByCollection(collection.getId());
        response.setDocuments(docs);
        return response;
    }

    private List<CollectionResponse> buildResponses(List<Collection> collections) {
        if (collections.isEmpty()) return List.of();
        Map<UUID, List<CollectionDocumentResponse>> docsByCollectionId = documentService
                .getDocumentsByCollectionIds(collections.stream().map(Collection::getId).collect(Collectors.toList()));
        return collections.stream()
                .map(c -> {
                    CollectionResponse response = collectionMapper.toResponse(c);
                    response.setDocuments(docsByCollectionId.getOrDefault(c.getId(), List.of()));
                    return response;
                })
                .collect(Collectors.toList());
    }

    private void audit(UUID collectionId, String action, UUID performedBy,
                       String prevStatus, String newStatus, String remarks) {
        auditLogRepository.save(CollectionAuditLog.builder()
                .collectionId(collectionId)
                .action(action)
                .performedBy(performedBy)
                .previousStatus(prevStatus)
                .newStatus(newStatus)
                .remarks(remarks)
                .build());
    }
}
