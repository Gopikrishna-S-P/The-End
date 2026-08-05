package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateOrganizationPlatformRequest {
    @NotBlank @Size(max = 255)
    private String name;

    @NotBlank @Size(max = 50)
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "must be uppercase letters, digits, underscore or hyphen only")
    private String code;
}
