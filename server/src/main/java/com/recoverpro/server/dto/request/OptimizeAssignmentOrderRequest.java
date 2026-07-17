package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class OptimizeAssignmentOrderRequest {

    @NotNull
    private UUID organizationId;

    private UUID agentId;

    @NotEmpty
    private List<UUID> allocationIds;

    @DecimalMin(value = "8.4",  message = "Agent latitude must be within India (≥ 8.4°N)")
    @DecimalMax(value = "37.6", message = "Agent latitude must be within India (≤ 37.6°N)")
    private BigDecimal agentLatitude;

    @DecimalMin(value = "68.7", message = "Agent longitude must be within India (≥ 68.7°E)")
    @DecimalMax(value = "97.4", message = "Agent longitude must be within India (≤ 97.4°E)")
    private BigDecimal agentLongitude;

    @AssertTrue(message = "agentLatitude and agentLongitude must both be provided or both omitted")
    public boolean isAgentLocationConsistent() {
        return (agentLatitude == null) == (agentLongitude == null);
    }
}
