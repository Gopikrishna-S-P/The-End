package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateNonContactableRequest {

    @NotNull
    private UUID allocationId;

    private UUID visitId;

    @NotBlank
    @Size(max = 50)
    private String reason;

    @Size(max = 2000)
    private String notes;
}
