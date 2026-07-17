package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.AssignmentResponse;
import com.recoverpro.server.entity.Assignment;
import org.springframework.stereotype.Component;

@Component
public class AssignmentMapper {

    public AssignmentResponse toResponse(Assignment assignment) {
        if (assignment == null) return null;
        return AssignmentResponse.builder()
                .id(assignment.getId())
                .allocationId(assignment.getAllocationId())
                .agentId(assignment.getAgentId())
                .organizationId(assignment.getOrganizationId())
                .assignedBy(assignment.getAssignedBy())
                .priority(assignment.getPriority())
                .status(assignment.getStatus())
                .assignmentDate(assignment.getAssignmentDate())
                .sequenceOrder(assignment.getSequenceOrder())
                .reassignmentReason(assignment.getReassignmentReason())
                .previousAgentId(assignment.getPreviousAgentId())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }
}
