package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateDirectUserRequest {

    @NotBlank @Email
    private String email;

    @NotBlank @Size(max = 100)
    private String firstName;

    @NotBlank @Size(max = 100)
    private String lastName;

    /** ORG_ADMIN or PLATFORM_ADMIN */
    @NotBlank
    private String role;

    /** Required when role = ORG_ADMIN */
    private UUID organizationId;
}
