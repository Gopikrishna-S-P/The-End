package com.recoverpro.server.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogResponse {

    private UUID id;
    private UUID assignmentId;
    private UUID allocationId;
    private String action;
    private UUID performedBy;
    private String performedByName;
    private UUID previousAgentId;
    private UUID newAgentId;
    private String reason;
    private String metadata;
    private Instant createdAt;
}
