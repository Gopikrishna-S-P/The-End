package com.recoverpro.server.security;

import com.recoverpro.server.enums.DashboardRole;
import lombok.*;

import java.util.UUID;

/**
 * Resolved from JWT in the security filter chain and stored in SecurityContext.
 *
 * scopeId semantics:
 *   PLATFORM_ADMIN → null  (cross-org visibility)
 *   all other roles → organizationId
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthenticatedUser {

    private UUID userId;
    private String email;
    private DashboardRole role;
    private UUID scopeId;

    public boolean isPlatformAdmin() {
        return DashboardRole.PLATFORM_ADMIN == role;
    }

    public boolean isOrgAdmin() {
        return DashboardRole.ORG_ADMIN == role;
    }

    public boolean isFieldRole() {
        return role == DashboardRole.FO
            || role == DashboardRole.CALLER
            || role == DashboardRole.TL
            || role == DashboardRole.MANAGER;
    }

    public boolean hasOrgScope() {
        return scopeId != null;
    }
}
