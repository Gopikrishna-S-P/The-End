package com.recoverpro.server.dto.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkAssignResponse {

    private int totalRequested;
    private int totalSucceeded;
    private int totalFailed;
    private boolean strictModeApplied;
    private boolean rolledBack;
    private List<AssignmentResponse> successfulAssignments;
    private List<AssignmentFailureDetail> failures;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AssignmentFailureDetail {
        private UUID allocationId;
        private String reason;
    }
}
