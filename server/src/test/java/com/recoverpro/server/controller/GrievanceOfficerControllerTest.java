package com.recoverpro.server.controller;

import com.recoverpro.server.dto.request.UpsertGrievanceOfficerRequest;
import com.recoverpro.server.dto.response.GrievanceOfficerResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.GrievanceOfficerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GrievanceOfficerControllerTest {

    @Mock private GrievanceOfficerService grievanceOfficerService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private GrievanceOfficerController newController() {
        return new GrievanceOfficerController(grievanceOfficerService, platformAdminAccessGuard);
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
    void upsert_orgAdmin_usesOwnOrgWithoutElevating() {
        GrievanceOfficerController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(grievanceOfficerService.upsert(eq(ownOrg), any(), any())).thenReturn(
                GrievanceOfficerResponse.builder().id(UUID.randomUUID()).organizationId(ownOrg).build());

        controller.upsert(new UpsertGrievanceOfficerRequest(), null, null, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
        verify(grievanceOfficerService).upsert(eq(ownOrg), any(), any());
    }

    @Test
    void upsert_platformAdmin_withOrgId_elevatesWithReason() {
        GrievanceOfficerController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(grievanceOfficerService.upsert(eq(targetOrg), any(), any())).thenReturn(
                GrievanceOfficerResponse.builder().id(UUID.randomUUID()).organizationId(targetOrg).build());

        controller.upsert(new UpsertGrievanceOfficerRequest(), targetOrg, "onboarding new org", admin);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("onboarding new org"), eq("grievanceOfficers:upsert"));
    }

    @Test
    void get_orgAdmin_usesOwnOrgWithoutElevating() {
        GrievanceOfficerController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_FO", ownOrg);
        when(grievanceOfficerService.getByOrganization(ownOrg)).thenReturn(
                GrievanceOfficerResponse.builder().id(UUID.randomUUID()).organizationId(ownOrg).build());

        controller.get(null, null, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }
}
