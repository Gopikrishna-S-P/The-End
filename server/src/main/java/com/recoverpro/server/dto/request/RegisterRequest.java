package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank @Email(message = "Invalid email format")
    private String email;

    @NotBlank
    @Size(min = 8, max = 128, message = "Password must be 8-128 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$",
        message = "Password must contain uppercase, lowercase, number and special character"
    )
    private String password;

    @NotBlank @Size(max = 100)
    @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]+$",
             message = "Name must not contain control or invisible characters")
    private String firstName;

    @NotBlank @Size(max = 100)
    @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]+$",
             message = "Name must not contain control or invisible characters")
    private String lastName;
}
