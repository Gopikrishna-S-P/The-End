package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapacityConfigRequest {

    @NotNull(message = "Organization ID is required")
    private UUID organizationId;

    @NotNull(message = "Max cases per agent per day is required")
    @Min(value = 1, message = "Must allow at least 1 case per agent per day")
    @Max(value = 500, message = "Cannot exceed 500 cases per agent per day")
    private Integer maxCasesPerAgentPerDay;

    @NotNull
    private Boolean allowWeekendAssignments;

    @NotNull
    private Boolean allowHolidayAssignments;
}
