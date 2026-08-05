package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.Priority;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReassignRequest {

    @NotNull(message = "New agent ID is required")
    private UUID newAgentId;

    @NotNull(message = "Assignment date is required")
    @FutureOrPresent(message = "Assignment date must be today or in the future")
    private LocalDate assignmentDate;

    @NotBlank(message = "Reassignment reason is mandatory")
    @Size(min = 10, max = 1000, message = "Reason must be between 10 and 1000 characters")
    private String reason;

    private Priority priority;
}
