package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SosRequest {

    @NotNull
    private UUID agentId;

    private Double lat;
    private Double lng;
    private Double accuracy;
    private String notes;
}
