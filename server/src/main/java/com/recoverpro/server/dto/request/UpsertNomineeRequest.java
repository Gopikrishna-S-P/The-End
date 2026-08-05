package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpsertNomineeRequest {

    @NotBlank
    @Size(max = 200)
    private String nomineeName;

    @NotBlank
    @Size(max = 50)
    private String nomineeRelation;

    @Size(max = 20)
    private String nomineePhone;

    @Email
    @Size(max = 200)
    private String nomineeEmail;
}
