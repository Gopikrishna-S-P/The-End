package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.Instant;

@Data
public class LocationPingRequest {

    // agentId is deliberately NOT a client-supplied field -- it's always the authenticated
    // principal's own id (see AgentFieldController.recordPing). A client-supplied agent
    // identity here would let any authenticated user submit location pings as someone else.

    @NotNull
    @DecimalMin("8.4")
    @DecimalMax("37.6")
    private Double lat;

    @NotNull
    @DecimalMin("68.7")
    @DecimalMax("97.4")
    private Double lng;

    private Double accuracy;
    private Double batteryLevel;
    private boolean mockLocationDetected;
    private Instant recordedAt;
}
