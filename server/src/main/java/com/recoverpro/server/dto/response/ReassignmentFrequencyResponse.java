package com.recoverpro.server.dto.response;
import java.util.UUID;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReassignmentFrequencyResponse {

    private UUID organizationId;
    private LocalDate fromDate;
    private LocalDate toDate;

    private Integer totalReassignments;
    private Double avgReassignmentsPerAgent;

    private List<AgentReassignmentRow> agentBreakdown;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgentReassignmentRow {
        private UUID agentId;
        private Integer reassignedOut;
        private Integer reassignedIn;
        private Integer netReassignments;
        private Double reassignmentRate;
    }
}


