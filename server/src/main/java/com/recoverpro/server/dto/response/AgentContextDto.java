package com.recoverpro.server.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentContextDto {

    private String agentFirstName;
    private int totalAssignedToday;
    private int completedToday;
    private int pendingToday;
    private int overdueCases;
    private int activePtps;
    private int brokenPtps;
    private BigDecimal collectionEfficiencyPercent;
    private BigDecimal ptpFulfillmentRatePercent;
    private int totalCollectionsThisMonth;
}
