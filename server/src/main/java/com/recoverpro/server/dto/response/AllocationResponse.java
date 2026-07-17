package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.Disp;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllocationResponse {

    private UUID id;
    private UUID fileUploadId;
    private UUID organizationId;
    private String loanNumber;
    private String borrowerName;
    private AllocationStatus status;
    private Disp latestDisposition;
    private UUID assignedToUserId;
    private Instant assignedAt;
    private Map<String, Object> dynamicData;
    private Integer rowNumber;
    private Boolean npaFlagged;
    private BigDecimal totalDue;
    private BigDecimal outstandingAmount;
    private UUID borrowerId;
    private Instant createdAt;
    private Instant updatedAt;
    private String agentName;
    private BigDecimal emi;
}
