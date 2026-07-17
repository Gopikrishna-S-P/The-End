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
public class FoDayReportResponse {

    private UUID agentId;
    private String agentName;
    private LocalDate date;
    private Instant generatedAt;

    private Instant dayStartedAt;
    private Instant dayEndedAt;
    private Long totalDayMins;

    private double totalDistanceKm;
    private int totalSessions;
    private int completedVisits;
    private int abandonedSessions;

    private List<SessionRow> sessions;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SessionRow {
        private UUID sessionId;
        private UUID allocationId;
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
