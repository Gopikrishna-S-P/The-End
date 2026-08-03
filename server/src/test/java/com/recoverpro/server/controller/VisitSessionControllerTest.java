package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.VisitSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
 * Regression coverage: teamStatus/distanceSummary always queried principal.getOrganizationId()
 * directly, which is NULL for a platform admin -- there was no orgId parameter at all, so a
 * platform admin had no way to target any org. visit_sessions already has the platform-admin RLS
 * bypass (V063), but that's moot when the query is never given a real org to look for in the first
 * place.
 */
@ExtendWith(MockitoExtension.class)
class VisitSessionControllerTest {

    @Mock private VisitSessionService visitSessionService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private VisitSessionController newController() {
        return new VisitSessionController(visitSessionService, platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role, UUID orgId) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        lenient().doReturn(orgId).when(p).getOrganizationId();
        doReturn(List.of(new SimpleGrantedAuthority(role))).when(p).getAuthorities();
        return p;
    }

    @Test
    void teamStatus_platformAdmin_noOrgId_throwsClearBusinessException() {
        VisitSessionController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> controller.teamStatus(admin, null, null, null));
        org.assertj.core.api.Assertions.assertThat(ex.getMessage()).contains("must specify");

        verify(visitSessionService, never()).getTeamStatus(any(), any());
    }

    @Test
    void teamStatus_platformAdmin_withOrgId_elevatesWithReason() {
        VisitSessionController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(visitSessionService.getTeamStatus(eq(targetOrg), any())).thenReturn(List.of());

        controller.teamStatus(admin, targetOrg, "support case #3", null);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("support case #3"), eq("visitSessions:teamStatus"));
    }

    @Test
    void teamStatus_orgAdmin_usesOwnOrgWithoutElevating() {
        VisitSessionController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(visitSessionService.getTeamStatus(eq(ownOrg), any())).thenReturn(List.of());

        controller.teamStatus(orgAdmin, null, null, null);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }

    @Test
    void distanceSummary_platformAdmin_noOrgId_throwsClearBusinessException() {
        VisitSessionController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);

        assertThrows(BusinessException.class, () -> controller.distanceSummary(admin, null, null, null));

        verify(visitSessionService, never()).getDistanceSummary(any(), any());
    }

    @Test
    void distanceSummary_orgAdmin_usesOwnOrgWithoutElevating() {
        VisitSessionController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(visitSessionService.getDistanceSummary(eq(ownOrg), any())).thenReturn(List.of());

        controller.distanceSummary(orgAdmin, null, null, null);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }
}
