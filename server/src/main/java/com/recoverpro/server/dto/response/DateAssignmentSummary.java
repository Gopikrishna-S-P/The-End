package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DateAssignmentSummary {

    private LocalDate date;
    private int totalAssignments;
    private int totalAgentsInvolved;
    private Map<Priority, Integer> countByPriority;
    private Map<AssignmentStatus, Integer> countByStatus;
    private List<AgentAssignmentSummary> agentBreakdown;
}
