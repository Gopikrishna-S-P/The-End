package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Size(max = 100)
    @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]+$",
             message = "Name must not contain control or invisible characters")
    private String firstName;

    @Size(max = 100)
    @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]+$",
             message = "Name must not contain control or invisible characters")
    private String lastName;

    @Email(message = "Must be a valid email address")
    @Size(max = 255)
    private String email;
}
