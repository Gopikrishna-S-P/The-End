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

    private String notes;
}
