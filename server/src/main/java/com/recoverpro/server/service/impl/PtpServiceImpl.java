package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.dto.request.PtpFilterRequest;
import com.recoverpro.server.dto.request.UpdatePtpStatusRequest;
import com.recoverpro.server.dto.response.PtpHistoryResponse;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.dto.response.PtpStatisticsResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.PtpAuditLog;
import com.recoverpro.server.entity.PtpHistory;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.entity.VisitLog;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.exception.PendingPtpAlreadyExistsException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.mapper.PtpMapper;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.PtpService;
import com.recoverpro.server.service.VisitLogService;
import com.recoverpro.server.service.compliance.CoolingOffGuard;
import com.recoverpro.server.service.compliance.PtpEscalationService;
import com.recoverpro.server.service.compliance.SegmentActionPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtpServiceImpl implements PtpService {

    private static final String PTP_NOT_FOUND = "PTP record not found with id: ";
    private static final String SYSTEM_USER = "SYSTEM";
    private static final UUID SYSTEM_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final PtpRepository ptpRepository;
    private final PtpHistoryRepository ptpHistoryRepository;
    private final PtpAuditLogRepository ptpAuditLogRepository;
    private final PtpMapper ptpMapper;
    private final PtpNotificationService notificationService;
    private final VisitLogService visitLogService;
    private final AllocationRepository allocationRepository;
    private final UserRepository userRepository;
    private final CoolingOffGuard coolingOffGuard;
    private final PtpEscalationService ptpEscalationService;
    private final SegmentActionPolicy segmentActionPolicy;
    private final BorrowerRiskScoreRepository borrowerRiskScoreRepository;
    private final OrgIsolationGuard orgIsolationGuard;

    @Override
    @Transactional
    public PtpResponse createPtp(CreatePtpRequest request, UUID currentUserId) {
        Allocation targetAllocation = allocationRepository.findByIdAndIsDeletedFalse(request.getAllocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + request.getAllocationId()));
        if (!orgIsolationGuard.belongsToOrg(targetAllocation.getOrganization().getId())) {
            throw new ResourceNotFoundException("Allocation not found: " + request.getAllocationId());
        }

        coolingOffGuard.enforce(request.getAllocationId(), targetAllocation.getOrganization().getId(), currentUserId);

        boolean hasPendingPtp = ptpRepository.existsByAllocationIdAndStatusAndIsDeletedFalse(
                request.getAllocationId(), PtpStatus.PENDING);
        if (hasPendingPtp) {
            throw new PendingPtpAlreadyExistsException(
                    "A pending PTP already exists for this allocation. Please resolve it before creating a new one.");
        }

        if (request.getVisitId() != null) {
            VisitLog visitLog = visitLogService.findVisitById(request.getVisitId());
            if (visitLog.getCollectionId() != null) {
                throw new BusinessException("Cannot create PTP: This visit has a Collection linked.");
            }
            if (visitLog.getPtpId() != null) {
                throw new BusinessException("This visit already has a PTP linked.");
            }
        }

        PtpRecord ptpRecord = ptpMapper.toEntity(request, currentUserId);

        if (ptpRecord.getFloorAmount() == null) {
            try {
                Allocation alloc = allocationRepository.findById(request.getAllocationId()).orElse(null);
                if (alloc != null && alloc.getBorrowerId() != null && alloc.getOutstandingAmount() != null) {
                    var risk = borrowerRiskScoreRepository
                            .findFirstByBorrowerIdOrderByScoredAtDesc(alloc.getBorrowerId())
                            .orElse(null);
                    var segment = risk == null ? null : risk.getSegment();
                    BigDecimal floor = segmentActionPolicy.computeFloorAmount(segment, alloc.getOutstandingAmount());
                    if (floor != null && floor.signum() > 0) {
                        ptpRecord.setFloorAmount(floor);
                    }
                }
            } catch (Exception e) {
                log.warn("Auto-derive floor_amount failed for PTP on allocation {}: {}",
                        request.getAllocationId(), e.getMessage());
            }
        }

        PtpRecord saved = ptpRepository.save(ptpRecord);

        if (request.getVisitId() != null) {
            try {
                visitLogService.linkPtp(request.getVisitId(), saved.getId());
            } catch (Exception e) {
                log.warn("Failed to link PTP to visit {}: {}", request.getVisitId(), e.getMessage());
            }
        }

        recordHistory(saved, null, PtpStatus.PENDING, null, null, currentUserId, SYSTEM_USER);
        return ptpMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PtpResponse getPtpById(UUID id) {
        return ptpMapper.toResponse(findActivePtpById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PtpResponse> getAllPtps(PtpFilterRequest filter, Pageable pageable) {
        return ptpRepository.findAll(PtpSpecification.withFilters(filter), pageable)
                .map(ptpMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtpResponse> getPtpsByAllocationId(UUID allocationId) {
        return ptpRepository.findAllByAllocationIdOrderByCreatedAtDesc(allocationId)
                .stream().map(ptpMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtpResponse> getPtpsByAllocationIds(List<UUID> allocationIds) {
        if (allocationIds == null || allocationIds.isEmpty()) return List.of();
        return ptpRepository.findAllByAllocationIdsOrdered(allocationIds)
                .stream().map(ptpMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PtpResponse updatePtpStatus(UUID id, UpdatePtpStatusRequest request,
                                       UUID currentUserId, String currentUserName) {
        PtpRecord record = findActivePtpById(id);
        PtpStatus previousStatus = record.getStatus();
        PtpStatus newStatus = request.getNewStatus();

        validateStatusTransition(previousStatus, newStatus);

        if (newStatus == PtpStatus.CANCELLED) {
            if (request.getReason() == null || request.getReason().isBlank()) {
                throw new BusinessException("Cancellation reason is required when cancelling a PTP.");
            }
            record.setCancellationReason(request.getReason());
        }

        if (newStatus == PtpStatus.FULFILLED) {
            BigDecimal collected = request.getCollectedAmount() != null
                    ? request.getCollectedAmount()
                    : record.getPromisedAmount();
            record.setCollectedAmount(collected);
            record.setFulfilledAt(Instant.now());
        }

        if (newStatus == PtpStatus.PARTIALLY_FULFILLED) {
            if (request.getCollectedAmount() == null || request.getCollectedAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Collected amount is required for partial fulfillment.");
            }
            if (request.getCollectedAmount().compareTo(record.getPromisedAmount()) >= 0) {
                throw new BusinessException("For partial fulfillment, collected amount must be less than promised amount.");
            }
            record.setCollectedAmount(request.getCollectedAmount());
        }

        if (newStatus == PtpStatus.BROKEN) {
            record.setBrokenReason(request.getReason());
            record.setBrokenAt(Instant.now());
        }

        record.setStatus(newStatus);
        record.setUpdatedBy(currentUserId);
        PtpRecord updated = ptpRepository.save(record);

        recordHistory(updated, previousStatus, newStatus, request.getCollectedAmount(),
                request.getReason(), currentUserId, currentUserName);

        if (newStatus == PtpStatus.BROKEN) {
            ptpEscalationService.onPtpBroken(updated.getAllocationId(), updated.getPromisedAmount());
            notificationService.notifyAgentPtpBroken(updated);
            notificationService.notifyOrgHighValuePtpBroken(updated);
        }
        return ptpMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void deletePtp(UUID id, UUID currentUserId) {
        PtpRecord record = findActivePtpById(id);
        if (record.getStatus() == PtpStatus.FULFILLED) {
            throw new BusinessException("Cannot delete a fulfilled PTP record.");
        }
        record.setIsDeleted(true);
        record.setUpdatedBy(currentUserId);
        ptpRepository.save(record);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtpHistoryResponse> getPtpHistory(UUID ptpId) {
        findActivePtpById(ptpId);
        return ptpHistoryRepository.findAllByPtpIdOrderByChangedAtDesc(ptpId)
                .stream().map(ptpMapper::toHistoryResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtpHistoryResponse> getFullAllocationHistory(UUID allocationId) {
        return ptpHistoryRepository.findFullHistoryByAllocationId(allocationId)
                .stream().map(ptpMapper::toHistoryResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PtpStatisticsResponse getAgentStatistics(UUID agentId) {
        List<PtpRecord> records = ptpRepository.findByAgentIdAndStatus(agentId, null, Pageable.unpaged())
                .getContent();

        if (records.isEmpty()) {
            return PtpStatisticsResponse.builder()
                    .agentId(agentId)
                    .totalPtps(0L)
                    .fulfillmentRate(BigDecimal.ZERO)
                    .collectionEfficiency(BigDecimal.ZERO)
                    .build();
        }

        String agentName = records.get(0).getAgentName();
        long total = records.size();
        long pending = records.stream().filter(r -> r.getStatus() == PtpStatus.PENDING).count();
        long fulfilled = records.stream().filter(r -> r.getStatus() == PtpStatus.FULFILLED).count();
        long partial = records.stream().filter(r -> r.getStatus() == PtpStatus.PARTIALLY_FULFILLED).count();
        long broken = records.stream().filter(r -> r.getStatus() == PtpStatus.BROKEN).count();
        long cancelled = records.stream().filter(r -> r.getStatus() == PtpStatus.CANCELLED).count();

        BigDecimal totalPromised = records.stream()
                .map(PtpRecord::getPromisedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCollected = records.stream()
                .map(r -> r.getCollectedAmount() != null ? r.getCollectedAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long resolved = fulfilled + partial + broken + cancelled;
        BigDecimal fulfillmentRate = resolved > 0
                ? BigDecimal.valueOf(fulfilled + partial)
                        .divide(BigDecimal.valueOf(resolved), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal collectionEfficiency = totalPromised.compareTo(BigDecimal.ZERO) > 0
                ? totalCollected.divide(totalPromised, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return PtpStatisticsResponse.builder()
                .agentId(agentId).agentName(agentName).totalPtps(total)
                .pendingCount(pending).fulfilledCount(fulfilled).partiallyFulfilledCount(partial)
                .brokenCount(broken).cancelledCount(cancelled)
                .totalPromisedAmount(totalPromised).totalCollectedAmount(totalCollected)
                .fulfillmentRate(fulfillmentRate).collectionEfficiency(collectionEfficiency)
                .build();
    }

    @Override
    @Transactional
    public int autoMarkExpiredPtpsAsBroken() {
        LocalDate today = LocalDate.now();
        List<PtpRecord> expiredPtps = ptpRepository.findExpiredPendingPtps(today);
        if (expiredPtps.isEmpty()) return 0;

        List<UUID> ids = expiredPtps.stream().map(PtpRecord::getId).collect(Collectors.toList());
        String reason = "Auto-marked as BROKEN by nightly scheduler: promised date has passed without fulfillment.";
        int updated = ptpRepository.bulkMarkAsBroken(ids, reason);

        expiredPtps.forEach(ptp -> {
            recordHistory(ptp, PtpStatus.PENDING, PtpStatus.BROKEN, ptp.getCollectedAmount(),
                    reason, SYSTEM_USER_ID, SYSTEM_USER);
            ptpEscalationService.onPtpBroken(ptp.getAllocationId(), ptp.getPromisedAmount());
            notificationService.notifyAgentPtpBroken(ptp);
            notificationService.notifyOrgHighValuePtpBroken(ptp);
        });

        log.info("Marked {} PTPs as BROKEN by nightly scheduler.", updated);
        return updated;
    }

    @Override
    @Transactional
    public int sendDueDateReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<PtpRecord> duePtps = ptpRepository.findPtpsDueForReminder(tomorrow);
        if (duePtps.isEmpty()) return 0;

        List<UUID> ids = duePtps.stream().map(PtpRecord::getId).collect(Collectors.toList());
        duePtps.forEach(ptp -> {
            try {
                notificationService.sendPtpReminderToAgent(ptp);
            } catch (Exception e) {
                log.error("Failed to send reminder for PTP id: {}, agent: {}", ptp.getId(), ptp.getAgentId(), e);
            }
        });

        ptpRepository.bulkMarkReminderSent(ids);
        log.info("Sent reminders for {} PTPs due tomorrow.", ids.size());
        return ids.size();
    }

    private PtpRecord findActivePtpById(UUID id) {
        PtpRecord ptp = ptpRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException(PTP_NOT_FOUND + id));
        Allocation parent = allocationRepository.findByIdAndIsDeletedFalse(ptp.getAllocationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Allocation not found for PTP: " + ptp.getAllocationId()));
        UUID orgId = parent.getOrganization().getId();
        if (!orgIsolationGuard.belongsToOrg(orgId)) {
            throw new ResourceNotFoundException(PTP_NOT_FOUND + id);
        }
        return ptp;
    }

    private void validateStatusTransition(PtpStatus from, PtpStatus to) {
        if (from == PtpStatus.FULFILLED || from == PtpStatus.BROKEN || from == PtpStatus.CANCELLED) {
            throw new BusinessException(
                    String.format("Cannot transition PTP from terminal status '%s' to '%s'.", from, to));
        }
        if (from == PtpStatus.PARTIALLY_FULFILLED
                && to != PtpStatus.FULFILLED
                && to != PtpStatus.BROKEN
                && to != PtpStatus.CANCELLED) {
            throw new BusinessException(
                    String.format("Invalid status transition from '%s' to '%s'.", from, to));
        }
    }

    private void recordHistory(PtpRecord ptp, PtpStatus previousStatus, PtpStatus newStatus,
                               BigDecimal collectedAmount, String reason,
                               UUID changedBy, String changedByName) {
        PtpHistory history = PtpHistory.builder()
                .ptpId(ptp.getId())
                .allocationId(ptp.getAllocationId())
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .collectedAmountSnapshot(collectedAmount != null ? collectedAmount : ptp.getCollectedAmount())
                .changeReason(reason)
                .changedBy(changedBy)
                .changedByName(changedByName)
                .build();
        ptpHistoryRepository.save(history);

        ptpAuditLogRepository.save(PtpAuditLog.builder()
                .ptpId(ptp.getId())
                .allocationId(ptp.getAllocationId())
                .action(previousStatus == null ? "CREATED" : "STATUS_CHANGED")
                .performedBy(changedBy)
                .previousStatus(previousStatus == null ? null : previousStatus.name())
                .newStatus(newStatus.name())
                .reason(reason)
                .build());
    }
}
