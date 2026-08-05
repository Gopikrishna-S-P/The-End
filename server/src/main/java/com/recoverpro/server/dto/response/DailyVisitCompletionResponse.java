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
public class DailyVisitCompletionResponse {

    private LocalDate reportDate;
    private UUID organizationId;

    private Integer totalAgentsWorking;
    private Integer totalAssigned;
    private Integer totalVisited;
    private Integer totalPending;
    private BigDecimal overallCompletionRate;

    private List<AgentDailyRow> agentRows;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgentDailyRow {
        private UUID agentId;
        private Integer assigned;
        private Integer visited;
        private Integer pending;
        private BigDecimal completionRate;
    }
}


