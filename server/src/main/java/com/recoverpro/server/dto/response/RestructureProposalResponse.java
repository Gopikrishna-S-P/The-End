package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.RestructureStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class RestructureProposalResponse {
    private UUID id;
    private UUID organizationId;
    private UUID allocationId;
    private UUID borrowerId;
    private Integer originalEmiCount;
    private BigDecimal originalEmiAmount;
    private BigDecimal originalApr;
    private Integer newEmiCount;
    private BigDecimal newEmiAmount;
    private BigDecimal newApr;
    private List<Map<String, Object>> stepSchedule;
    private String rationale;
    private RestructureStatus status;
    private UUID draftedByUserId;
    private Instant proposedToLenderAt;
    private UUID lenderApprovalUserId;
    private Instant lenderApprovalAt;
    private Instant borrowerAcceptedAt;
    private UUID borrowerConsentArtifactId;
    private UUID newAllocationId;
    private UUID rejectedByUserId;
    private Instant rejectedAt;
    private String rejectionReason;
    private Instant createdAt;
    private Instant updatedAt;
}
