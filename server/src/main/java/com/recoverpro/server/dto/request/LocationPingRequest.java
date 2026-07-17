package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class LocationPingRequest {

    @NotNull
    private UUID agentId;

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
