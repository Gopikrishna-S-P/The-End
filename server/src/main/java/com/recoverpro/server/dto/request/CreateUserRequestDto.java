package com.recoverpro.server.dto.request;

import com.recoverpro.server.entity.UserCreationRequest.RequestedRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateUserRequestDto {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotNull
    private RequestedRole role;

    /** Required when role == ORG_USER: which staff role (FO/CALLER/TL/MANAGER) to assign on
     * approval. Ignored for ORG_ADMIN requests. */
    private String staffRole;

    private String notes;
}
