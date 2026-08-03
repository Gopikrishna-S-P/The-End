package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.RestructureProposalResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RestructureProposalService;
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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: restructure_proposals' RLS policy (V065) lost its platform-admin escape in
 * V057's fail-closed sweep and never got the app.is_platform_admin bypass pattern applied afterwards
 * -- assertSameTenantOrg's "if platform admin, skip" branch was dead because the underlying fetch
 * already returned nothing for a platform-admin session, the same class of bug as ptp_records (V061).
 * list() additionally had no way for a platform admin to target any org at all (always queried
 * principal.getOrganizationId(), NULL for a platform admin) -- and getByAllocation had zero isolation
 * handling of any kind, unlike every sibling endpoint on this controller.
 */
@ExtendWith(MockitoExtension.class)
class RestructureProposalControllerTest {

    @Mock private RestructureProposalService restructureProposalService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private RestructureProposalController newController() {
        return new RestructureProposalController(restructureProposalService, platformAdminAccessGuard);
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
    void getById_platformAdmin_elevatesBeforeFetching() {
        RestructureProposalController controller = newController();
        UUID proposalId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(restructureProposalService.getById(proposalId)).thenReturn(
                RestructureProposalResponse.builder().id(proposalId).organizationId(UUID.randomUUID()).build());

        controller.getById(proposalId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(
                eq(admin.getId()), eq("restructureProposals:getById:" + proposalId));
    }

    @Test
    void getById_nonPlatformAdmin_foreignOrg_throwsNotFound() {
        RestructureProposalController controller = newController();
        UUID proposalId = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UUID foreignOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(restructureProposalService.getById(proposalId)).thenReturn(
                RestructureProposalResponse.builder().id(proposalId).organizationId(foreignOrg).build());

        assertThrows(ResourceNotFoundException.class, () -> controller.getById(proposalId, orgAdmin));

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void getByAllocation_platformAdmin_elevates() {
        RestructureProposalController controller = newController();
        UUID allocationId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(restructureProposalService.getByAllocationId(allocationId)).thenReturn(List.of());

        controller.getByAllocation(allocationId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(
                eq(admin.getId()), eq("restructureProposals:byAllocation:" + allocationId));
    }

    @Test
    void list_platformAdmin_noOrgIdRequested_doesNotElevate() {
        RestructureProposalController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        Page<RestructureProposalResponse> page = new PageImpl<>(List.of());
        when(restructureProposalService.getByOrganization(eq(null), any(), any())).thenReturn(page);

        controller.list(admin, null, null, null, 0, 20);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }

    @Test
    void list_platformAdmin_withOrgId_elevatesWithReason() {
        RestructureProposalController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        Page<RestructureProposalResponse> page = new PageImpl<>(List.of());
        when(restructureProposalService.getByOrganization(eq(targetOrg), any(), any())).thenReturn(page);

        controller.list(admin, targetOrg, "support case #9", null, 0, 20);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("support case #9"), eq("restructureProposals:list"));
    }

    @Test
    void list_orgAdmin_usesOwnOrgWithoutElevating() {
        RestructureProposalController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        Page<RestructureProposalResponse> page = new PageImpl<>(List.of());
        when(restructureProposalService.getByOrganization(eq(ownOrg), any(), any())).thenReturn(page);

        controller.list(orgAdmin, null, null, null, 0, 20);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }
}
