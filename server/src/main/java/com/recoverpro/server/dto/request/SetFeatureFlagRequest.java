package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class SetFeatureFlagRequest {

    /** Null means a global (platform-wide) flag -- PLATFORM_ADMIN only. */
    private UUID organizationId;

    @NotBlank
    @Size(max = 100)
    private String flagKey;

    @NotNull
    private Boolean enabled;

    @Size(max = 500)
    private String description;

    /** Required when a PLATFORM_ADMIN targets another org's flag -- see PlatformAdminAccessGuard. */
    @Size(max = 500)
    private String reason;
}
