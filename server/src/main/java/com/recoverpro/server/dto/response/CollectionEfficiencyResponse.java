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
public class CollectionEfficiencyResponse {

    private UUID organizationId;
    private LocalDate fromDate;
    private LocalDate toDate;

    private BigDecimal totalOutstanding;
    private BigDecimal totalCollected;
    private BigDecimal collectionEfficiencyPct;
    private BigDecimal recoveryRatePct;

    private List<AgentEfficiencyRow> agentBreakdown;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgentEfficiencyRow {
        private UUID agentId;
        private BigDecimal amountOutstanding;
        private BigDecimal amountCollected;
        private BigDecimal efficiencyPct;
        private BigDecimal recoveryRatePct;
        private Integer rank;
    }
}


