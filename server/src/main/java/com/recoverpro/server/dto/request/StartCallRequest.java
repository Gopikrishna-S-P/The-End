package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class StartCallRequest {

    @NotNull
    private UUID allocationId;
}
