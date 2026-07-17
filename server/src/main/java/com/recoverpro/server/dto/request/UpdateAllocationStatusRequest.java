package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.AllocationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAllocationStatusRequest {

    @NotNull(message = "Status is required")
    private AllocationStatus status;

    private UUID assignedToUserId;
}
