package com.recoverpro.server.dto.response;

import lombok.*;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private UUID id;
    private String name;
    private String description;
    private UUID organizationId;
    private String organizationName;
    private boolean systemRole;
    private Set<PermissionResponse> permissions;
}
