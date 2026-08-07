package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.request.BulkAssignRequest;
import com.recoverpro.server.dto.request.ReassignRequest;
import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Assignment;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.VisitLog;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.enums.Priority;
import com.recoverpro.server.exception.AssignmentCapacityExceededException;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.exception.InvalidAssignmentDateException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.mapper.AssignmentMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.AssignmentService;
import com.recoverpro.server.service.AuditLogService;
import com.recoverpro.server.service.CalendarService;
import com.recoverpro.server.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssignmentServiceImpl implements AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final CalendarService calendarService;
    private final AuditLogService auditLogService;
    private final AssignmentMapper assignmentMapper;
    private final AllocationRepository allocationRepository;
    private final UserRepository userRepository;
    private final VisitLogRepository visitLogRepository;
    private final OrgIsolationGuard orgIsolationGuard;
    private final NotificationService notificationService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BulkAssignResponse bulkAssign(BulkAssignRequest request, UUID performedBy) {
        log.info("BulkAssign: agentId={}, date={}, count={}, strictMode={}",
                request.getAgentId(), request.getAssignmentDate(),
                request.getAllocationIds().size(), request.getStrictMode());

        if (!orgIsolationGuard.belongsToOrg(request.getOrganizationId())) {
            throw new BusinessException("Access denied: organization mismatch");
        }

        User agent = userRepository.findById(request.getAgentId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + request.getAgentId()));
        if (!request.getOrganizationId().equals(agent.getOrganizationId())) {
            throw new ResourceNotFoundException("Agent not found: " + request.getAgentId());
        }

        validateAssignmentDate(request.getAssignmentDate(), request.getOrganizationId());

        int maxCases = calendarService.getMaxCasesPerAgentPerDay(request.getOrganizationId());
        int currentCount = assignmentRepository.countActiveAssignmentsByAgentAndDate(
                request.getAgentId(), request.getAssignmentDate());
        int available = maxCases - currentCount;

        if (available <= 0) {
            throw new AssignmentCapacityExceededException(
                    String.format("Agent %s has reached maximum capacity (%d) for date %s",
                            request.getAgentId(), maxCases, request.getAssignmentDate()));
        }

        Map<UUID, Integer> sequenceMap = buildSequenceMap(request);

        List<UUID> existingActiveAllocationIds = assignmentRepository
                .findActiveByAllocationIds(request.getAllocationIds())
                .stream()
                .map(Assignment::getAllocationId)
                .collect(Collectors.toList());

        List<AssignmentResponse> successes = new ArrayList<>();
        List<String> successLoanNumbers = new ArrayList<>();
        List<BulkAssignResponse.AssignmentFailureDetail> failures = new ArrayList<>();
        int nextSequence = assignmentRepository
                .findMaxSequenceOrderByAgentAndDate(request.getAgentId(), request.getAssignmentDate())
                .orElse(0) + 1;

        for (UUID allocationId : request.getAllocationIds()) {
            if (successes.size() >= available) {
                failures.add(BulkAssignResponse.AssignmentFailureDetail.builder()
                        .allocationId(allocationId)
                        .reason("Agent daily capacity limit reached (" + maxCases + " cases/day)")
                        .build());
                continue;
            }

            if (existingActiveAllocationIds.contains(allocationId)) {
                failures.add(BulkAssignResponse.AssignmentFailureDetail.builder()
                        .allocationId(allocationId)
                        .reason("Allocation already has an active assignment")
                        .build());
                continue;
            }

            Allocation allocation = allocationRepository.findById(allocationId).orElse(null);
            if (allocation == null || !request.getOrganizationId().equals(allocation.getOrganization().getId())) {
                failures.add(BulkAssignResponse.AssignmentFailureDetail.builder()
                        .allocationId(allocationId)
                        .reason("Allocation not found")
                        .build());
                continue;
            }

            try {
                Integer seqOrder = sequenceMap.getOrDefault(allocationId, nextSequence++);
                Assignment assignment = Assignment.builder()
                        .allocationId(allocationId)
                        .agentId(request.getAgentId())
                        .organizationId(request.getOrganizationId())
                        .assignedBy(performedBy)
                        .priority(request.getPriority())
                        .status(AssignmentStatus.PENDING)
                        .assignmentDate(request.getAssignmentDate())
                        .sequenceOrder(seqOrder)
                        .build();

                Assignment saved = assignmentRepository.save(assignment);
                auditLogService.logAssignment(saved.getId(), allocationId,
                        request.getAgentId(), performedBy,
                        "priority=" + request.getPriority() + ",date=" + request.getAssignmentDate());
                successes.add(assignmentMapper.toResponse(saved));
                successLoanNumbers.add(allocation.getLoanNumber());

            } catch (Exception e) {
                log.error("Failed to assign allocationId={}: {}", allocationId, e.getMessage());
                failures.add(BulkAssignResponse.AssignmentFailureDetail.builder()
                        .allocationId(allocationId)
                        .reason("Internal error: " + e.getMessage())
                        .build());
            }
        }

        boolean rolledBack = false;
        if (request.getStrictMode() && !failures.isEmpty()) {
            log.warn("StrictMode: rolling back {} successful assignments due to {} failures",
                    successes.size(), failures.size());
            successes.forEach(a -> assignmentRepository.softDeleteById(a.getId()));
            successes.clear();
            rolledBack = true;
        } else {
            successLoanNumbers.forEach(loanNumber -> notificationService.create(
                    request.getAgentId(), request.getOrganizationId(), NotificationType.FO_VISIT_ASSIGNED,
                    "Visit scheduled for " + request.getAssignmentDate(),
                    "You have a field visit for loan " + loanNumber + " on " + request.getAssignmentDate() + "."));
        }

        log.info("BulkAssign complete: succeeded={}, failed={}, rolledBack={}",
                successes.size(), failures.size(), rolledBack);

        return BulkAssignResponse.builder()
                .totalRequested(request.getAllocationIds().size())
                .totalSucceeded(successes.size())
                .totalFailed(failures.size())
                .strictModeApplied(request.getStrictMode())
                .rolledBack(rolledBack)
                .successfulAssignments(successes)
                .failures(failures)
                .build();
    }

    @Override
    @Transactional
    public AssignmentResponse reassign(UUID assignmentId, ReassignRequest request, UUID performedBy) {
        log.info("Reassign: assignmentId={}, newAgentId={}, performedBy={}",
                assignmentId, request.getNewAgentId(), performedBy);

        Assignment assignment = assignmentRepository.findByIdAndIsDeletedFalse(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        if (assignment.getStatus() == AssignmentStatus.COMPLETED ||
                assignment.getStatus() == AssignmentStatus.CANCELLED) {
            throw new BusinessException("Cannot reassign a " + assignment.getStatus() + " assignment");
        }

        User newAgent = userRepository.findById(request.getNewAgentId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + request.getNewAgentId()));
        if (!assignment.getOrganizationId().equals(newAgent.getOrganizationId())) {
            throw new ResourceNotFoundException("Agent not found: " + request.getNewAgentId());
        }

        LocalDate targetDate = request.getAssignmentDate() != null
                ? request.getAssignmentDate()
                : assignment.getAssignmentDate();

        validateAssignmentDate(targetDate, assignment.getOrganizationId());

        int maxCases = calendarService.getMaxCasesPerAgentPerDay(assignment.getOrganizationId());
        int currentCount = assignmentRepository.countActiveAssignmentsByAgentAndDate(
                request.getNewAgentId(), targetDate);
        if (currentCount >= maxCases) {
            throw new AssignmentCapacityExceededException(
                    String.format("Target agent %s has reached max capacity (%d) for date %s",
                            request.getNewAgentId(), maxCases, targetDate));
        }

        UUID previousAgentId = assignment.getAgentId();
        assignment.setPreviousAgentId(previousAgentId);
        assignment.setAgentId(request.getNewAgentId());
        assignment.setAssignmentDate(targetDate);
        assignment.setReassignmentReason(request.getReason());
        assignment.setStatus(AssignmentStatus.REASSIGNED);
        if (request.getPriority() != null) assignment.setPriority(request.getPriority());

        Assignment saved = assignmentRepository.save(assignment);
        auditLogService.logReassignment(assignmentId, assignment.getAllocationId(),
                previousAgentId, request.getNewAgentId(), performedBy, request.getReason());

        Allocation allocation = allocationRepository.findById(saved.getAllocationId()).orElse(null);
        notificationService.create(request.getNewAgentId(), saved.getOrganizationId(),
                NotificationType.FO_VISIT_ASSIGNED,
                "Visit scheduled for " + targetDate,
                "You have a field visit for loan " + (allocation != null ? allocation.getLoanNumber() : saved.getAllocationId())
                        + " on " + targetDate + ".");

        log.info("Reassignment complete: assignmentId={}, from={} to={}",
                assignmentId, previousAgentId, request.getNewAgentId());
        return assignmentMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentResponse getAssignmentById(UUID id) {
        return assignmentMapper.toResponse(
                assignmentRepository.findByIdAndIsDeletedFalse(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + id)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentResponse> getByAllocationId(UUID allocationId) {
        return assignmentRepository.findByAllocationIdAndIsDeletedFalseOrderByCreatedAtDesc(allocationId)
                .stream().map(assignmentMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentResponse> getByAllocationIds(List<UUID> allocationIds) {
        if (allocationIds == null || allocationIds.isEmpty()) return List.of();
        return assignmentRepository.findAllByAllocationIdsOrdered(allocationIds)
                .stream().map(assignmentMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AssignmentResponse> getAssignments(UUID orgId, UUID agentId, LocalDate date,
                                                   AssignmentStatus status, Priority priority,
                                                   Pageable pageable) {
        return assignmentRepository
                .findWithFilters(orgId, agentId, date, status, priority, pageable)
                .map(assignmentMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AssignmentResponse> getAssignmentsByAgentAndDate(UUID agentId, LocalDate date, Pageable pageable) {
        return assignmentRepository.findByAgentIdAndDate(agentId, date, pageable)
                .map(assignmentMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AgentAssignmentSummary getAgentSummary(UUID agentId, LocalDate date, UUID orgId) {
        List<Assignment> assignments = assignmentRepository.findByAgentIdAndDateOrdered(agentId, date);
        int maxCases = calendarService.getMaxCasesPerAgentPerDay(orgId);

        Map<Priority, Integer> byPriority = new EnumMap<>(Priority.class);
        Map<AssignmentStatus, Integer> byStatus = new EnumMap<>(AssignmentStatus.class);
        for (Assignment a : assignments) {
            byPriority.merge(a.getPriority(), 1, Integer::sum);
            byStatus.merge(a.getStatus(), 1, Integer::sum);
        }

        return AgentAssignmentSummary.builder()
                .agentId(agentId)
                .date(date)
                .totalAssigned(assignments.size())
                .maxCapacity(maxCases)
                .remainingCapacity(Math.max(0, maxCases - assignments.size()))
                .countByPriority(byPriority)
                .countByStatus(byStatus)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DateAssignmentSummary getDateSummary(LocalDate date, UUID orgId) {
        List<Assignment> assignments = assignmentRepository
                .findWithFilters(orgId, null, date, null, null, Pageable.unpaged())
                .getContent();

        Map<Priority, Integer> byPriority = new EnumMap<>(Priority.class);
        Map<AssignmentStatus, Integer> byStatus = new EnumMap<>(AssignmentStatus.class);
        Map<UUID, List<Assignment>> byAgent = new LinkedHashMap<>();

        for (Assignment a : assignments) {
            byPriority.merge(a.getPriority(), 1, Integer::sum);
            byStatus.merge(a.getStatus(), 1, Integer::sum);
            byAgent.computeIfAbsent(a.getAgentId(), k -> new ArrayList<>()).add(a);
        }

        int maxCases = calendarService.getMaxCasesPerAgentPerDay(orgId);
        List<AgentAssignmentSummary> agentBreakdowns = byAgent.entrySet().stream()
                .map(e -> summarizeAgent(e.getKey(), date, maxCases, e.getValue()))
                .sorted(Comparator.comparing(AgentAssignmentSummary::getAgentId))
                .collect(Collectors.toList());

        return DateAssignmentSummary.builder()
                .date(date)
                .totalAssignments(assignments.size())
                .totalAgentsInvolved(byAgent.size())
                .countByPriority(byPriority)
                .countByStatus(byStatus)
                .agentBreakdown(agentBreakdowns)
                .build();
    }

    private AgentAssignmentSummary summarizeAgent(UUID agentId, LocalDate date, int maxCases,
                                                    List<Assignment> agentAssignments) {
        Map<Priority, Integer> byPriority = new EnumMap<>(Priority.class);
        Map<AssignmentStatus, Integer> byStatus = new EnumMap<>(AssignmentStatus.class);
        for (Assignment a : agentAssignments) {
            byPriority.merge(a.getPriority(), 1, Integer::sum);
            byStatus.merge(a.getStatus(), 1, Integer::sum);
        }
        return AgentAssignmentSummary.builder()
                .agentId(agentId)
                .date(date)
                .totalAssigned(agentAssignments.size())
                .maxCapacity(maxCases)
                .remainingCapacity(Math.max(0, maxCases - agentAssignments.size()))
                .countByPriority(byPriority)
                .countByStatus(byStatus)
                .build();
    }

    @Override
    @Transactional
    public void cancelAssignment(UUID assignmentId, UUID performedBy) {
        Assignment assignment = assignmentRepository.findByIdAndIsDeletedFalse(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        if (assignment.getStatus() == AssignmentStatus.COMPLETED)
            throw new BusinessException("Cannot cancel a completed assignment");
        assignment.setStatus(AssignmentStatus.CANCELLED);
        assignmentRepository.save(assignment);
        auditLogService.logCancellation(assignmentId, assignment.getAllocationId(),
                assignment.getAgentId(), performedBy);
    }

    @Override
    @Transactional
    public void softDeleteAssignment(UUID assignmentId, UUID performedBy) {
        Assignment assignment = assignmentRepository.findByIdAndIsDeletedFalse(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        assignmentRepository.softDeleteById(assignmentId);
        auditLogService.logDeletion(assignmentId, assignment.getAllocationId(),
                assignment.getAgentId(), performedBy);
    }

    @Override
    @Transactional(readOnly = true)
    public int getRemainingCapacity(UUID agentId, LocalDate date, UUID orgId) {
        int max = calendarService.getMaxCasesPerAgentPerDay(orgId);
        int current = assignmentRepository.countActiveAssignmentsByAgentAndDate(agentId, date);
        return Math.max(0, max - current);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<MyAssignedCaseResponse> getMyActiveCases(
            UUID agentId, UUID organizationId, Pageable pageable) {

        List<AssignmentStatus> active = List.of(AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS);
        Page<Assignment> page = assignmentRepository.findActiveByAgentId(agentId, organizationId, active, pageable);

        List<UUID> allocationIds = page.getContent().stream()
                .map(Assignment::getAllocationId).collect(Collectors.toList());

        Map<UUID, Allocation> allocMap = allocationIds.isEmpty() ? Map.of()
                : allocationRepository.findAllById(allocationIds).stream()
                        .collect(Collectors.toMap(Allocation::getId, Function.identity()));

        Map<UUID, VisitLog> latestVisit = allocationIds.isEmpty() ? Map.of()
                : visitLogRepository.findAllByAllocationIdsOrdered(allocationIds).stream()
                        .collect(Collectors.toMap(VisitLog::getAllocationId,
                                Function.identity(), (first, second) -> first));

        List<MyAssignedCaseResponse> content = page.getContent().stream()
                .map(a -> {
                    Allocation alloc = allocMap.get(a.getAllocationId());
                    VisitLog last = latestVisit.get(a.getAllocationId());
                    return MyAssignedCaseResponse.builder()
                            .assignmentId(a.getId())
                            .assignmentDate(a.getAssignmentDate())
                            .assignmentStatus(a.getStatus())
                            .priority(a.getPriority())
                            .sequenceOrder(a.getSequenceOrder())
                            .allocationId(alloc != null ? alloc.getId() : a.getAllocationId())
                            .loanNumber(alloc != null ? alloc.getLoanNumber() : null)
                            .borrowerName(alloc != null ? alloc.getBorrowerName() : null)
                            .outstandingAmount(alloc != null ? alloc.getOutstandingAmount() : null)
                            .totalDue(alloc != null ? alloc.getTotalDue() : null)
                            .npaFlagged(alloc != null ? alloc.getNpaFlagged() : null)
                            .allocationStatus(alloc != null ? alloc.getStatus() : null)
                            .dynamicData(alloc != null ? alloc.getDynamicData() : null)
                            .lastVisitDate(last != null ? last.getVisitDate() : null)
                            .lastVisitDisposition(last != null ? last.getDisp() : null)
                            .build();
                })
                .collect(Collectors.toList());

        return PagedResponse.from(new PageImpl<>(content, pageable, page.getTotalElements()));
    }

    private void validateAssignmentDate(LocalDate date, UUID organizationId) {
        if (!calendarService.isAssignableDate(date, organizationId)) {
            throw new InvalidAssignmentDateException(
                    "Date " + date + " is not a valid assignment date (weekend or holiday)");
        }
    }

    private Map<UUID, Integer> buildSequenceMap(BulkAssignRequest request) {
        if (request.getSequenceOrders() == null) return Collections.emptyMap();
        return request.getSequenceOrders().stream()
                .collect(Collectors.toMap(
                        BulkAssignRequest.SequenceEntry::getAllocationId,
                        BulkAssignRequest.SequenceEntry::getSequenceOrder));
    }
}
