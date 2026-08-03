package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.dto.response.VisitImportResult;
import com.recoverpro.server.dto.response.VisitLogResponse;
import com.recoverpro.server.mapper.VisitLogMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.AllocationService;
import com.recoverpro.server.service.IdempotencyKeyService;
import com.recoverpro.server.service.VisitImportService;
import com.recoverpro.server.service.VisitLogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

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
 * Regression coverage for two bugs found in VisitLogController this pass:
 * 1. visit_logs and allocations both already had a platform-admin RLS bypass (V063), but nothing
 *    here ever called PlatformAdminAccessGuard, so the by-id endpoints' "if platform admin, skip"
 *    checks were dead -- the fetch before them already came back empty under RLS.
 * 2. importVisits took no orgId parameter at all, so a platform admin (whose organizationId is
 *    always null) had no way to supply one -- VisitImportServiceImpl.importFromExcel dereferences
 *    organizationId unconditionally (including a bare .equals() call), so every platform-admin
 *    import attempt threw a NullPointerException partway through processing.
 */
@ExtendWith(MockitoExtension.class)
class VisitLogControllerTest {

    @Mock private VisitLogService visitLogService;
    @Mock private AllocationService allocationService;
    @Mock private IdempotencyKeyService idempotencyKeyService;
    @Mock private AllocationRepository allocationRepository;
    @Mock private VisitLogRepository visitLogRepository;
    @Mock private VisitLogMapper visitLogMapper;
    @Mock private VisitImportService visitImportService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private VisitLogController newController() {
        return new VisitLogController(visitLogService, allocationService, idempotencyKeyService,
                allocationRepository, visitLogRepository, visitLogMapper, visitImportService,
                platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role, UUID orgId) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        lenient().doReturn(orgId).when(p).getOrganizationId();
        doReturn(List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(role)))
                .when(p).getAuthorities();
        return p;
    }

    @Test
    void getById_platformAdmin_elevatesBeforeFetching() {
        VisitLogController controller = newController();
        UUID visitId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(visitLogService.getById(visitId)).thenReturn(
                VisitLogResponse.builder().id(visitId).organizationId(UUID.randomUUID()).build());

        controller.getById(admin, visitId);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("visitLogs:getById:" + visitId));
    }

    @Test
    void getById_nonPlatformAdmin_doesNotElevate() {
        VisitLogController controller = newController();
        UUID visitId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", orgId);
        when(visitLogService.getById(visitId)).thenReturn(
                VisitLogResponse.builder().id(visitId).organizationId(orgId).build());

        controller.getById(orgAdmin, visitId);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void importVisits_platformAdmin_noOrgId_throwsClearBusinessException() {
        VisitLogController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        MockMultipartFile file = new MockMultipartFile("file", "visits.xlsx", "application/vnd.ms-excel", new byte[]{1});

        BusinessException ex = assertThrows(BusinessException.class,
                () -> controller.importVisits(file, null, null, admin));
        org.assertj.core.api.Assertions.assertThat(ex.getMessage()).contains("must specify");

        verify(visitImportService, never()).importFromExcel(any(), any(), any());
    }

    @Test
    void importVisits_platformAdmin_withOrgId_elevatesWithReason() {
        VisitLogController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        MockMultipartFile file = new MockMultipartFile("file", "visits.xlsx", "application/vnd.ms-excel", new byte[]{1});
        when(visitImportService.importFromExcel(any(), eq(targetOrg), any()))
                .thenReturn(VisitImportResult.builder().total(0).imported(0).failed(0).errors(List.of()).build());

        controller.importVisits(file, targetOrg, "support ticket #5", admin);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("support ticket #5"), eq("visitLogs:import"));
    }

    @Test
    void importVisits_orgAdmin_usesOwnOrgWithoutElevating() {
        VisitLogController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        MockMultipartFile file = new MockMultipartFile("file", "visits.xlsx", "application/vnd.ms-excel", new byte[]{1});
        when(visitImportService.importFromExcel(any(), eq(ownOrg), any()))
                .thenReturn(VisitImportResult.builder().total(0).imported(0).failed(0).errors(List.of()).build());

        controller.importVisits(file, null, null, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }

    @Test
    void getByAgent_platformAdmin_elevates() {
        VisitLogController controller = newController();
        UUID agentId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(visitLogService.getByAgentIdPaged(eq(agentId), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));

        controller.getByAgent(admin, agentId, org.springframework.data.domain.PageRequest.of(0, 20));

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("visitLogs:byAgent:" + agentId));
    }
}
