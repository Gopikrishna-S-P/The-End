package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.AuditLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Assignment-lifecycle audit trail (SYSTEM-PLAN SP42 -- split out of a combined interface that
 * also carried generic user-action logging; see {@link UserActionAuditService} for that half).
 */
public interface AuditLogService {

    void logAssignment(UUID assignmentId, UUID allocationId, UUID agentId, UUID performedBy, String metadata);

    void logReassignment(UUID assignmentId, UUID allocationId, UUID previousAgentId, UUID newAgentId,
                         UUID performedBy, String reason);

    void logCancellation(UUID assignmentId, UUID allocationId, UUID agentId, UUID performedBy);

    void logDeletion(UUID assignmentId, UUID allocationId, UUID agentId, UUID performedBy);

    Page<AuditLogResponse> getLogsByAssignment(UUID assignmentId, Pageable pageable);

    Page<AuditLogResponse> getLogsByAllocation(UUID allocationId, Pageable pageable);

    List<AuditLogResponse> getLogsByAllocationIds(List<UUID> allocationIds);

    Page<AuditLogResponse> getLogsByPerformedBy(UUID performedBy, Pageable pageable);

    Page<AuditLogResponse> getLogsByOrganization(UUID orgId, Pageable pageable);
}
