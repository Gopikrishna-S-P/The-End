package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateOrganizationRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Code must be uppercase alphanumeric, underscore, or hyphen")
    private String code;

    @NotBlank
    @Email
    private String adminEmail;

    @NotBlank
    @Size(max = 100)
    private String adminFirstName;

    @NotBlank
    @Size(max = 100)
    private String adminLastName;

    @NotBlank
    @Size(min = 8, max = 100)
    private String adminPassword;
}
