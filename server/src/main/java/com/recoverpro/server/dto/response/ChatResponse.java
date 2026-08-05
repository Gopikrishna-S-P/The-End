package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.enums.SafetyDecision;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatResponse {

    private UUID messageId;
    private String sessionId;
    private String reply;
    private boolean blocked;
    private String blockReason;
    private SafetyDecision inputSafetyDecision;
    private SafetyDecision outputSafetyDecision;
    private Long latencyMs;
    private Instant timestamp;
    private String modelName;

    // Populated when Lucien has a WRITE tool pending user confirmation
    private boolean confirmationRequired;
    private String pendingActionId;
    private String pendingActionSummary;
    private String pendingToolName;
}
