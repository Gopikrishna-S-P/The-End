package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank @Email
    private String email;

    @NotBlank
    private String password;

    private String totpCode;

    /** MFA recovery code, used instead of totpCode when the authenticator is unavailable. */
    private String recoveryCode;
}
