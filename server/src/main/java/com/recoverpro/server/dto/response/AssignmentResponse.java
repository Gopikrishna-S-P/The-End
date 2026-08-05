package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentResponse {

    private UUID id;
    private UUID allocationId;
    private UUID agentId;
    private UUID organizationId;
    private UUID assignedBy;
    private Priority priority;
    private AssignmentStatus status;
    private LocalDate assignmentDate;
    private Integer sequenceOrder;
    private String reassignmentReason;
    private UUID previousAgentId;
    private Instant createdAt;
    private Instant updatedAt;
}
