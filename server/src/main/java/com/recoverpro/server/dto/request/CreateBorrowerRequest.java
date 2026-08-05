package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateBorrowerRequest {

    @NotNull
    private UUID organizationId;

    @Size(max = 50)
    private String ckycId;

    @NotBlank
    @Size(max = 200)
    private String firstName;

    @Size(max = 200)
    private String lastName;

    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 30)
    private String phone;

    private String address;
}
