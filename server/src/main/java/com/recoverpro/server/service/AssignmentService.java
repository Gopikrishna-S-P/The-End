package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.BulkAssignRequest;
import com.recoverpro.server.dto.request.ReassignRequest;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AssignmentService {

    BulkAssignResponse bulkAssign(BulkAssignRequest request, UUID performedBy);

    AssignmentResponse reassign(UUID assignmentId, ReassignRequest request, UUID performedBy);

    AssignmentResponse getAssignmentById(UUID id);

    Page<AssignmentResponse> getAssignments(UUID orgId, UUID agentId, LocalDate date,
                                            AssignmentStatus status, Priority priority, Pageable pageable);

    List<AssignmentResponse> getByAllocationId(UUID allocationId);

    List<AssignmentResponse> getByAllocationIds(List<UUID> allocationIds);

    Page<AssignmentResponse> getAssignmentsByAgentAndDate(UUID agentId, LocalDate date, Pageable pageable);

    AgentAssignmentSummary getAgentSummary(UUID agentId, LocalDate date, UUID orgId);

    DateAssignmentSummary getDateSummary(LocalDate date, UUID orgId);

    void cancelAssignment(UUID assignmentId, UUID performedBy);

    void softDeleteAssignment(UUID assignmentId, UUID performedBy);

    int getRemainingCapacity(UUID agentId, LocalDate date, UUID orgId);

    PagedResponse<MyAssignedCaseResponse> getMyActiveCases(UUID agentId, UUID organizationId, Pageable pageable);
}
