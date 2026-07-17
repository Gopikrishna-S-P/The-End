package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.ConsentPurpose;
import com.recoverpro.server.enums.ConsentScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class GrantConsentRequest {

    @NotNull
    private ConsentPurpose purpose;

    @NotNull
    private ConsentScope scope;

    @NotBlank
    private String termsText;

    @NotBlank
    @Size(max = 30)
    private String termsVersion;

    @Size(max = 500)
    private String evidenceRef;

    private Instant expiresAt;
}
