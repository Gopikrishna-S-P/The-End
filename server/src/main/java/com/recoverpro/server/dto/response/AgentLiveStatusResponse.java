package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AgentLiveStatusResponse {

    private UUID shiftId;
    private UUID agentId;
    private Instant shiftStartedAt;
    private Double lastLat;
    private Double lastLng;
    private Double lastAccuracy;
    private Instant lastPingAt;
    private boolean lastMockDetected;
}
