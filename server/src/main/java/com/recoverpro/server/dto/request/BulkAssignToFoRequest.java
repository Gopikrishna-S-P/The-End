package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class BulkAssignToFoRequest {

    @NotEmpty(message = "At least one case is required")
    private List<UUID> allocationIds;

    @NotNull(message = "Field officer (assignedToUserId) is required")
    private UUID assignedToUserId;
}
