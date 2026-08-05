package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.Priority;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkAssignRequest {

    @NotNull(message = "Agent ID is required")
    private UUID agentId;

    @NotNull(message = "Organization ID is required")
    private UUID organizationId;

    @NotNull(message = "Assignment date is required")
    @FutureOrPresent(message = "Assignment date must be today or in the future")
    private LocalDate assignmentDate;

    @NotEmpty(message = "Allocation IDs must not be empty")
    @Size(max = 50, message = "Cannot assign more than 50 cases at once")
    private List<@NotNull UUID> allocationIds;

    @NotNull(message = "Priority is required")
    private Priority priority;

    @Builder.Default
    private Boolean strictMode = false;

    @Valid
    private List<SequenceEntry> sequenceOrders;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SequenceEntry {
        @NotNull private UUID allocationId;
        @NotNull @Min(1) private Integer sequenceOrder;
    }
}
