package com.recoverpro.server.dto.response;
import java.util.UUID;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamPerformanceResponse {

    private UUID organizationId;
    private LocalDate fromDate;
    private LocalDate toDate;

    private Integer totalAgents;
    private Integer totalAssigned;
    private Integer totalVisited;
    private Integer totalCollected;

    private BigDecimal totalAmountCollected;
    private BigDecimal totalAmountOutstanding;
    private BigDecimal avgCollectionEfficiency;
    private BigDecimal avgVisitCompletionRate;
    private BigDecimal overallEfficiencyScore;

    private List<AgentPerformanceResponse> agentBreakdown;
}


