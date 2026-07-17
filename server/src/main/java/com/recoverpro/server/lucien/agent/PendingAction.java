package com.recoverpro.server.lucien.agent;

import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * WRITE tool call awaiting user confirmation.
 * Stored in Redis under lucien:pending:{sessionId} with TTL=5min.
 * Fail-closed: Redis down → no pending actions resolvable.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingAction implements Serializable {

    private String actionId;
    private String sessionId;
    private UUID principalId;
    private UUID organizationId;
    private String toolName;
    private String toolArgsJson;
    private String humanSummary;
    private Instant expiresAt;
}
