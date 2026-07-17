package com.recoverpro.server.dto.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldAgentDashboardResponse {

    private UUID agentId;
    private String agentFirstName;
    private String agentLastName;
    private String today;

    private int todayTotalCases;
    private int todayCompletedCases;
    private int todayPendingCases;
    private int todayRescheduledCases;
    private double todayCompletionRate;

    private double collectedAmountToday;
    private int collectionsSubmittedToday;
    private int pendingPtps;
    private int ptpsDueToday;

    private List<TodayAssignmentEntry> todayAssignments;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TodayAssignmentEntry {
        private UUID assignmentId;
        private UUID allocationId;
        private String loanNumber;
        private String borrowerName;
        private String status;
        private String priorityLevel;
        private Integer sequenceOrder;
        private boolean npaFlagged;
    }
}
