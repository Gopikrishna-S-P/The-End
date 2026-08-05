package com.recoverpro.server.controller;

import com.recoverpro.server.dto.response.RoleResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RoleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: roles' RLS policy (V067) already had "OR organization_id IS NULL" (so system
 * roles are visible to everyone) but that does nothing for an org-specific role, which stayed
 * invisible to a platform admin regardless -- RoleServiceImpl's own isPlatformAdmin branches
 * (listRolesForCaller's findAll(), assertCanAccessRole/assertCanModifyRole's early return) were
 * already correct but dead, because the RLS-scoped fetch already filtered those rows out first.
 */
@ExtendWith(MockitoExtension.class)
class RoleControllerTest {

    @Mock private RoleService roleService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private RoleController newController() {
        return new RoleController(roleService, platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role, UUID orgId) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        lenient().doReturn(orgId).when(p).getOrganizationId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    @Test
    void listRoles_platformAdmin_elevatesBeforeFetching() {
        RoleController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(roleService.listRolesForCaller()).thenReturn(List.of());

        controller.listRoles(admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("roles:list"));
    }

    @Test
    void listRoles_nonPlatformAdmin_doesNotElevate() {
        RoleController controller = newController();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", UUID.randomUUID());
        when(roleService.listRolesForCaller()).thenReturn(List.of());

        controller.listRoles(orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void getRole_platformAdmin_elevatesBeforeFetching() {
        RoleController controller = newController();
        UUID roleId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(roleService.getRoleById(roleId)).thenReturn(RoleResponse.builder().id(roleId).build());

        controller.getRole(roleId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("roles:getById:" + roleId));
    }

    @Test
    void updatePermissions_platformAdmin_elevatesBeforeFetching() {
        RoleController controller = newController();
        UUID roleId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(roleService.updateRolePermissions(eq(roleId), any())).thenReturn(RoleResponse.builder().id(roleId).build());

        controller.updatePermissions(roleId, Set.of(), admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("roles:updatePermissions:" + roleId));
    }

    @Test
    void deleteRole_platformAdmin_elevatesBeforeFetching() {
        RoleController controller = newController();
        UUID roleId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);

        controller.deleteRole(roleId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("roles:delete:" + roleId));
    }

    @Test
    void deleteRole_nonPlatformAdmin_doesNotElevate() {
        RoleController controller = newController();
        UUID roleId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", UUID.randomUUID());

        controller.deleteRole(roleId, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }
}
