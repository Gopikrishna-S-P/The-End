package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.IngestStatementRequest;
import com.recoverpro.server.dto.response.ReconciliationRunResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.ReconciliationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
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
 * Regression coverage for two gaps found in ReconciliationController:
 * 1. ingest() had no app-layer check that the caller's org matched the request body's
 *    organizationId -- reconciliation_runs' fail-closed RLS would reject a cross-tenant ORG_ADMIN
 *    write, but as a raw DataIntegrityViolationException (500), not a clean 404.
 * 2. reconciliation_runs' RLS policy (V062) had no platform-admin bypass at all, so every
 *    "if platform admin" branch here was dead the same way ptp_records' was before V061.
 */
@ExtendWith(MockitoExtension.class)
class ReconciliationControllerTest {

    @Mock private ReconciliationService reconciliationService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private ReconciliationController newController() {
        return new ReconciliationController(reconciliationService, platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role, UUID orgId) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        lenient().doReturn(orgId).when(p).getOrganizationId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    private IngestStatementRequest ingestRequest(UUID orgId) {
        IngestStatementRequest req = new IngestStatementRequest();
        req.setOrganizationId(orgId);
        req.setSource("HDFC");
        req.setAsOfDate(LocalDate.now());
        req.setRows(List.of());
        return req;
    }

    @Test
    void ingest_orgAdminForeignOrg_throwsNotFound() {
        ReconciliationController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UUID foreignOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);

        assertThrows(ResourceNotFoundException.class,
                () -> controller.ingest(ingestRequest(foreignOrg), null, orgAdmin));

        verify(reconciliationService, never()).ingestAndMatch(any(), any());
    }

    @Test
    void ingest_orgAdminOwnOrg_succeedsWithoutElevating() {
        ReconciliationController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(reconciliationService.ingestAndMatch(any(), any()))
                .thenReturn(ReconciliationRunResponse.builder().id(UUID.randomUUID()).organizationId(ownOrg).build());

        controller.ingest(ingestRequest(ownOrg), null, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }

    @Test
    void ingest_platformAdmin_elevatesWithReason() {
        ReconciliationController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(reconciliationService.ingestAndMatch(any(), any()))
                .thenReturn(ReconciliationRunResponse.builder().id(UUID.randomUUID()).organizationId(targetOrg).build());

        controller.ingest(ingestRequest(targetOrg), "support ticket #123", admin);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("support ticket #123"), eq("reconciliation:ingest"));
    }

    @Test
    void listRuns_orgAdminForeignOrg_throwsNotFound() {
        ReconciliationController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UUID foreignOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);

        assertThrows(ResourceNotFoundException.class,
                () -> controller.listRuns(foreignOrg, null, 0, 20, orgAdmin));
    }

    @Test
    void listRuns_platformAdmin_elevatesWithReason() {
        ReconciliationController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        Page<ReconciliationRunResponse> page = new PageImpl<>(List.of());
        when(reconciliationService.listRuns(eq(targetOrg), any())).thenReturn(page);

        controller.listRuns(targetOrg, "audit review", 0, 20, admin);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("audit review"), eq("reconciliation:listRuns"));
    }

    @Test
    void getRun_platformAdmin_elevatesBeforeFetching() {
        ReconciliationController controller = newController();
        UUID runId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(reconciliationService.getRun(runId)).thenReturn(
                ReconciliationRunResponse.builder().id(runId).organizationId(UUID.randomUUID()).build());

        controller.getRun(runId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("reconciliation:getRun:" + runId));
    }

    @Test
    void getRun_nonPlatformAdmin_doesNotElevate() {
        ReconciliationController controller = newController();
        UUID runId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", orgId);
        when(reconciliationService.getRun(runId)).thenReturn(
                ReconciliationRunResponse.builder().id(runId).organizationId(orgId).build());

        controller.getRun(runId, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void listRows_platformAdmin_elevatesBeforeFetching() {
        ReconciliationController controller = newController();
        UUID runId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(reconciliationService.getRun(runId)).thenReturn(
                ReconciliationRunResponse.builder().id(runId).organizationId(UUID.randomUUID()).build());
        when(reconciliationService.listRows(eq(runId), any(), any())).thenReturn(new PageImpl<>(List.of()));

        controller.listRows(runId, null, 0, 50, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("reconciliation:listRows:" + runId));
    }
}
