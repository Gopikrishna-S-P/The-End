package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.GrievanceResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.GrievanceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Mirrors SettlementOfferControllerTest's isolation coverage for the same established pattern. */
@ExtendWith(MockitoExtension.class)
class GrievanceControllerTest {

    @Mock private GrievanceService grievanceService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private GrievanceController newController() {
        return new GrievanceController(grievanceService, platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role, UUID orgId) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        lenient().doReturn(orgId).when(p).getOrganizationId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        lenient().doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    @Test
    void raise_usesCallersOwnOrganizationId() {
        GrievanceController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal fo = principalWithRole("ROLE_FO", ownOrg);
        when(grievanceService.raise(any(), eq(ownOrg), any())).thenReturn(
                GrievanceResponse.builder().id(UUID.randomUUID()).organizationId(ownOrg).build());

        controller.raise(new com.recoverpro.server.dto.request.RaiseGrievanceRequest(), fo);

        verify(grievanceService).raise(any(), eq(ownOrg), any());
    }

    @Test
    void getById_platformAdmin_elevatesBeforeFetching() {
        GrievanceController controller = newController();
        UUID id = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(grievanceService.getById(id)).thenReturn(
                GrievanceResponse.builder().id(id).organizationId(UUID.randomUUID()).build());

        controller.getById(id, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("grievances:getById:" + id));
    }

    @Test
    void getById_nonPlatformAdmin_foreignOrg_throwsNotFound() {
        GrievanceController controller = newController();
        UUID id = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UUID foreignOrg = UUID.randomUUID();
        UserPrincipal tl = principalWithRole("ROLE_TL", ownOrg);
        when(grievanceService.getById(id)).thenReturn(
                GrievanceResponse.builder().id(id).organizationId(foreignOrg).build());

        assertThrows(ResourceNotFoundException.class, () -> controller.getById(id, tl));
    }

    @Test
    void acknowledge_orgAdmin_doesNotElevate() {
        GrievanceController controller = newController();
        UUID id = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(grievanceService.getById(id)).thenReturn(
                GrievanceResponse.builder().id(id).organizationId(ownOrg).build());
        when(grievanceService.acknowledge(eq(id), any(), any())).thenReturn(
                GrievanceResponse.builder().id(id).organizationId(ownOrg).build());

        controller.acknowledge(id, null, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void list_orgAdmin_usesOwnOrgWithoutElevating() {
        GrievanceController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        Page<GrievanceResponse> page = new PageImpl<>(List.of());
        when(grievanceService.getByOrganization(eq(ownOrg), any(), any())).thenReturn(page);

        controller.list(orgAdmin, null, null, null, 0, 20);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }

    @Test
    void list_platformAdmin_withOrgId_elevatesWithReason() {
        GrievanceController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        Page<GrievanceResponse> page = new PageImpl<>(List.of());
        when(grievanceService.getByOrganization(eq(targetOrg), any(), any())).thenReturn(page);

        controller.list(admin, targetOrg, "support case #9", null, 0, 20);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("support case #9"), eq("grievances:list"));
    }

    @Test
    void getByAllocation_platformAdmin_elevates() {
        GrievanceController controller = newController();
        UUID allocationId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(grievanceService.getByAllocationId(allocationId)).thenReturn(List.of());

        controller.getByAllocation(allocationId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(
                eq(admin.getId()), eq("grievances:byAllocation:" + allocationId));
    }
}
