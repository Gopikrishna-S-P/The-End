package com.recoverpro.server.dto.response;

import lombok.*;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPermissionsResponse {
    private Set<PermissionResponse> fromRoles;
    private Set<DirectPermissionResponse> direct;
}
