package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KpiControllerTest {

    @Mock private JdbcTemplate jdbc;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private KpiController newController() {
        return new KpiController(jdbc, platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        lenient().doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    @Test
    void collectionEfficiency_orgAdminOwnOrg_returnsData() {
        KpiController controller = newController();
        UUID orgId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN");
        doReturn(orgId).when(orgAdmin).getOrganizationId();
        when(jdbc.queryForList(any(String.class), eq(orgId))).thenReturn(List.of());

        controller.collectionEfficiency(orgId, null, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }

    @Test
    void collectionEfficiency_orgAdminDifferentOrg_throwsNotFound() {
        KpiController controller = newController();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN");
        doReturn(UUID.randomUUID()).when(orgAdmin).getOrganizationId();

        assertThatThrownBy(() -> controller.collectionEfficiency(UUID.randomUUID(), null, orgAdmin))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void collectionEfficiency_platformAdmin_elevatesBeforeQuerying() {
        KpiController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN");
        when(jdbc.queryForList(any(String.class), eq(targetOrg))).thenReturn(List.of());

        controller.collectionEfficiency(targetOrg, "support ticket 123", admin);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("support ticket 123"), eq("kpi:collectionEfficiency"));
    }

    @Test
    void callingHoursViolations_platformAdmin_alwaysElevatesWithReason() {
        KpiController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN");
        when(jdbc.queryForList(any(String.class), eq(targetOrg))).thenReturn(List.of());

        controller.callingHoursViolations(targetOrg, "compliance audit", admin);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("compliance audit"), eq("kpi:callingHoursViolations"));
    }
}
