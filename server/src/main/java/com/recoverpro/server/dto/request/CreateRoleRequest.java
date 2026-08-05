package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
public class CreateRoleRequest {

    @NotBlank @Size(max = 50)
    private String name;

    @Size(max = 255)
    private String description;

    /** null = system-wide role; set to caller's org for custom roles */
    private UUID organizationId;

    private Set<UUID> permissionIds;
}
