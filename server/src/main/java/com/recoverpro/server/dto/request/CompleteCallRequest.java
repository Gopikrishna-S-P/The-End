package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.CallOutcome;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompleteCallRequest {

    @NotNull
    private CallOutcome outcome;

    @Size(max = 2000)
    private String notes;

    private Integer durationSeconds;
}
