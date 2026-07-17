package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.ErasureRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DataErasureRequestResponse {
    private UUID id;
    private UUID borrowerId;
    private UUID organizationId;
    private UUID requestedByUserId;
    private String reason;
    private ErasureRequestStatus status;
    private String complianceNotes;
    private UUID reviewedByUserId;
    private Instant reviewedAt;
    private Instant executedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
