package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MisEodReportResponse {

    private LocalDate date;
    private UUID organizationId;
    private String organizationName;
    private Instant generatedAt;

    private long totalDispatched;
    private long activeAgents;

    private long visitsCompleted;
    private long visitsInProgress;
    private long visitsAbandoned;
    private double completionRate;

    private long collectionsCount;
    private BigDecimal totalCollected;

    private long ptpCount;
    private BigDecimal totalPromised;

    private long nonContactableCount;
    private long pendingApprovals;

    private List<FoRow> foBreakdown;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class FoRow {
        private UUID agentId;
        private String agentName;

        private Instant loginTime;
        private Instant logoutTime;

        private long dispatched;
        private long visited;
        private long collected;
        private BigDecimal amountCollected;
        private long ptpMade;
        private long nonContactable;
        private double distanceKm;

        private List<CaseRow> cases;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CaseRow {
        private String loanNumber;
        private String borrowerName;
        private String status;
        private Instant startedAt;
        private Instant reachedAt;
        private Instant waitingSince;
        private Instant closedAt;
        private Long transitMins;
        private Long waitingMins;
        private Long totalMins;
        private double distanceKm;
        private String outcome;
        private BigDecimal amountCollected;
        private String paymentMode;
    }
}
