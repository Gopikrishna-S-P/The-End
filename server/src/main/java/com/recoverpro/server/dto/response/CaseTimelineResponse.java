package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.AllocationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseTimelineResponse {
    private UUID allocationId;
    private UUID organizationId;
    private String loanNumber;
    private String borrowerName;
    private AllocationStatus currentStatus;
    private Boolean npaFlagged;
    private BigDecimal totalDue;
    private BigDecimal outstandingAmount;
    private List<CaseEventResponse> events;
}
