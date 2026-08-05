package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.AuditLogResponse;
import com.recoverpro.server.dto.response.UserActionAuditResponse;
import com.recoverpro.server.entity.AssignmentAuditLog;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.UserActionAuditLog;
import com.recoverpro.server.repository.AssignmentAuditLogRepository;
import com.recoverpro.server.repository.UserActionAuditLogRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.AuditLogService;
import com.recoverpro.server.service.UserActionAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService, UserActionAuditService {

    private final AssignmentAuditLogRepository auditLogRepository;
    private final UserActionAuditLogRepository userActionAuditLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void logAssignment(UUID assignmentId, UUID allocationId, UUID agentId,
                              UUID performedBy, String metadata) {
        save(assignmentId, allocationId, "ASSIGNED", performedBy, null, agentId, null, metadata);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void logReassignment(UUID assignmentId, UUID allocationId, UUID previousAgentId,
                                UUID newAgentId, UUID performedBy, String reason) {
        save(assignmentId, allocationId, "REASSIGNED", performedBy, previousAgentId, newAgentId, reason, null);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void logCancellation(UUID assignmentId, UUID allocationId, UUID agentId, UUID performedBy) {
        save(assignmentId, allocationId, "CANCELLED", performedBy, agentId, null, null, null);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void logDeletion(UUID assignmentId, UUID allocationId, UUID agentId, UUID performedBy) {
        save(assignmentId, allocationId, "DELETED", performedBy, agentId, null, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getLogsByAssignment(UUID assignmentId, Pageable pageable) {
        return toResponsePage(auditLogRepository.findByAssignmentIdOrderByCreatedAtDesc(assignmentId, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getLogsByAllocation(UUID allocationId, Pageable pageable) {
        return toResponsePage(auditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getLogsByAllocationIds(List<UUID> allocationIds) {
        if (allocationIds == null || allocationIds.isEmpty()) return List.of();
        List<AssignmentAuditLog> entries = auditLogRepository.findByAllocationIdsOrderByCreatedAtDesc(allocationIds);
        Map<UUID, User> usersById = batchUsersById(entries, AssignmentAuditLog::getPerformedBy);
        return entries.stream().map(e -> toResponse(e, usersById)).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getLogsByPerformedBy(UUID performedBy, Pageable pageable) {
        return toResponsePage(auditLogRepository.findByPerformedByOrderByCreatedAtDesc(performedBy, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getLogsByOrganization(UUID orgId, Pageable pageable) {
        return toResponsePage(auditLogRepository.findByOrganizationId(orgId, pageable));
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logUserAction(UUID userId, String action, String details) {
        UserActionAuditLog entry = UserActionAuditLog.builder()
                .userId(userId)
                .action(action)
                .details(details)
                .build();
        userActionAuditLogRepository.save(entry);
        log.debug("Audited user action: userId={}, action={}", userId, action);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserActionAuditResponse> getUserActionLogs(UUID userId, Pageable pageable) {
        return toUserActionResponsePage(userActionAuditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserActionAuditResponse> getAllUserActionLogs(Pageable pageable) {
        return toUserActionResponsePage(userActionAuditLogRepository.findAllByOrderByCreatedAtDesc(pageable));
    }

    private void save(UUID assignmentId, UUID allocationId, String action, UUID performedBy,
                      UUID previousAgentId, UUID newAgentId, String reason, String metadata) {
        AssignmentAuditLog entry = AssignmentAuditLog.builder()
                .assignmentId(assignmentId)
                .allocationId(allocationId)
                .action(action)
                .performedBy(performedBy)
                .previousAgentId(previousAgentId)
                .newAgentId(newAgentId)
                .reason(reason)
                .metadata(metadata)
                .build();
        auditLogRepository.save(entry);
    }

    private Page<AuditLogResponse> toResponsePage(Page<AssignmentAuditLog> page) {
        Map<UUID, User> usersById = batchUsersById(page.getContent(), AssignmentAuditLog::getPerformedBy);
        return page.map(e -> toResponse(e, usersById));
    }

    private Page<UserActionAuditResponse> toUserActionResponsePage(Page<UserActionAuditLog> page) {
        Map<UUID, User> usersById = batchUsersById(page.getContent(), UserActionAuditLog::getUserId);
        return page.map(e -> toUserActionResponse(e, usersById));
    }

    private <T> Map<UUID, User> batchUsersById(List<T> entries, Function<T, UUID> idExtractor) {
        List<UUID> ids = entries.stream().map(idExtractor).filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getId, u -> u));
    }

    private AuditLogResponse toResponse(AssignmentAuditLog entry, Map<UUID, User> usersById) {
        User performer = entry.getPerformedBy() != null ? usersById.get(entry.getPerformedBy()) : null;
        String performedByName = performer != null ? performer.getFirstName() + " " + performer.getLastName() : null;
        return AuditLogResponse.builder()
                .id(entry.getId())
                .assignmentId(entry.getAssignmentId())
                .allocationId(entry.getAllocationId())
                .action(entry.getAction())
                .performedBy(entry.getPerformedBy())
                .performedByName(performedByName)
                .previousAgentId(entry.getPreviousAgentId())
                .newAgentId(entry.getNewAgentId())
                .reason(entry.getReason())
                .metadata(entry.getMetadata())
                .createdAt(entry.getCreatedAt())
                .build();
    }

    private UserActionAuditResponse toUserActionResponse(UserActionAuditLog entry, Map<UUID, User> usersById) {
        User user = usersById.get(entry.getUserId());
        String userEmail = user != null ? user.getEmail() : "Unknown User";
        return UserActionAuditResponse.builder()
                .id(entry.getId())
                .userId(entry.getUserId())
                .userEmail(userEmail)
                .action(entry.getAction())
                .details(entry.getDetails())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
