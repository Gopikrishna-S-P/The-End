package com.recoverpro.server.dto.response;
import java.util.UUID;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentPerformanceResponse {

    private UUID agentId;
    private UUID organizationId;
    private LocalDate snapshotDate;

    private Integer totalAssigned;
    private Integer totalVisited;
    private Integer totalCollected;
    private Integer totalPending;
    private Integer totalReassignedOut;
    private Integer totalReassignedIn;

    private BigDecimal amountCollected;
    private BigDecimal amountOutstanding;

    private BigDecimal visitCompletionRate;
    private BigDecimal collectionEfficiency;
    private BigDecimal efficiencyScore;

    private Integer rankInOrg;
}


