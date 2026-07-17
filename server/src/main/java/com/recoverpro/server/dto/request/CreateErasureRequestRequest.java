package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateErasureRequestRequest {

    @NotBlank
    private String reason;
}
