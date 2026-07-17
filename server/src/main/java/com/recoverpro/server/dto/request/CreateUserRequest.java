package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.Set;

@Data
public class CreateUserRequest {

    @NotBlank @Email
    private String email;

    @NotBlank @Size(max = 100)
    @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]+$",
             message = "Name must not contain control or invisible characters")
    private String firstName;

    @NotBlank @Size(max = 100)
    @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]+$",
             message = "Name must not contain control or invisible characters")
    private String lastName;

    /** System role names to attach at creation — e.g. ROLE_FIELD_OFFICER, ROLE_TEAM_LEADER */
    private Set<String> roleNames;
}
