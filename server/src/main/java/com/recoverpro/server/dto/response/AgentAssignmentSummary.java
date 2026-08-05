package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import lombok.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentAssignmentSummary {

    private UUID agentId;
    private LocalDate date;
    private int totalAssigned;
    private int remainingCapacity;
    private int maxCapacity;
    private Map<Priority, Integer> countByPriority;
    private Map<AssignmentStatus, Integer> countByStatus;
}
