package com.recoverpro.server.controller;

import com.recoverpro.server.dto.request.PtpFilterRequest;
import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.AllocationService;
import com.recoverpro.server.service.IdempotencyKeyService;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.PtpService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: ptp_records' RLS policy (V061) only grants a platform admin cross-org
 * visibility once app.is_platform_admin is set for the request -- getById/getAll/etc. all had
 * "if platform admin" branches already, but nothing ever called PlatformAdminAccessGuard, so
 * ptpService's underlying queries came back empty for a platform admin regardless. These tests
 * prove the controller now elevates before the fetch for a platform-admin caller, and does not for
 * anyone else.
 */
@ExtendWith(MockitoExtension.class)
class PtpControllerTest {

    @Mock private PtpService ptpService;
    @Mock private IdempotencyKeyService idempotencyKeyService;
    @Mock private AllocationService allocationService;
    @Mock private AllocationRepository allocationRepository;
    @Mock private UserRepository userRepository;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;
    @Mock private NotificationService notificationService;

    private PtpController newController() {
        return new PtpController(ptpService, idempotencyKeyService, allocationService,
                allocationRepository, userRepository, platformAdminAccessGuard, notificationService);
    }

    private UserPrincipal principalWithRole(String role) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    @Test
    void getById_platformAdmin_elevatesBeforeFetching() {
        PtpController controller = newController();
        UUID ptpId = UUID.randomUUID();
        UUID allocationId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN");

        when(ptpService.getPtpById(ptpId)).thenReturn(
                PtpResponse.builder().id(ptpId).allocationId(allocationId).agentId(UUID.randomUUID()).build());
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());

        controller.getById(admin, ptpId);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(any(), anyString());
    }

    @Test
    void getById_nonPlatformAdmin_doesNotElevate() {
        PtpController controller = newController();
        UUID ptpId = UUID.randomUUID();
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UserPrincipal fo = principalWithRole("ROLE_FO");
        doReturn(orgId).when(fo).getOrganizationId();
        UUID agentId = UUID.randomUUID();
        doReturn(agentId).when(fo).getId();

        when(ptpService.getPtpById(ptpId)).thenReturn(
                PtpResponse.builder().id(ptpId).allocationId(allocationId).agentId(agentId).build());
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(orgId).build());

        controller.getById(fo, ptpId);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), anyString());
    }

    @Test
    void getAll_platformAdmin_elevatesBeforeListing() {
        PtpController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN");
        Page<PtpResponse> page = new PageImpl<>(List.of());
        when(ptpService.getAllPtps(any(PtpFilterRequest.class), any())).thenReturn(page);

        controller.getAll(admin, new PtpFilterRequest(), 0, 20, "createdAt", "DESC");

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("ptp:list"));
    }
}
