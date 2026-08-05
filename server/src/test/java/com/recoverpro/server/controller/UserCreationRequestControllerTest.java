package com.recoverpro.server.controller;

import com.recoverpro.server.dto.request.ReviewRequestDto;
import com.recoverpro.server.dto.response.UserCreationRequestResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.UserCreationRequestService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: user_creation_requests' RLS policy (V068) had no platform-admin bypass, so
 * listPending/pendingCount/review's already-correct isPlatformAdmin branches (the whole reason those
 * branches exist: platform admins approve ORG_ADMIN-role requests, one tier above what an ORG_ADMIN
 * can approve) always saw an RLS-filtered-empty result -- the top approval tier was unreachable.
 */
@ExtendWith(MockitoExtension.class)
class UserCreationRequestControllerTest {

    @Mock private UserCreationRequestService service;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private UserCreationRequestController newController() {
        return new UserCreationRequestController(service, platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    @Test
    void listPending_platformAdmin_elevatesBeforeFetching() {
        UserCreationRequestController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN");
        Page<UserCreationRequestResponse> page = new PageImpl<>(List.of());
        when(service.listPendingForApprover(eq(admin), any())).thenReturn(page);

        controller.listPending(0, 20, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("userRequests:pending"));
    }

    @Test
    void listPending_orgAdmin_doesNotElevate() {
        UserCreationRequestController controller = newController();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN");
        Page<UserCreationRequestResponse> page = new PageImpl<>(List.of());
        when(service.listPendingForApprover(eq(orgAdmin), any())).thenReturn(page);

        controller.listPending(0, 20, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void pendingCount_platformAdmin_elevates() {
        UserCreationRequestController controller = newController();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN");
        when(service.countPendingForApprover(admin)).thenReturn(0L);

        controller.pendingCount(admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("userRequests:pendingCount"));
    }

    @Test
    void review_platformAdmin_elevatesBeforeReviewing() {
        UserCreationRequestController controller = newController();
        UUID requestId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN");
        ReviewRequestDto dto = new ReviewRequestDto();
        when(service.review(eq(requestId), eq(dto), eq(admin)))
                .thenReturn(UserCreationRequestResponse.builder().id(requestId).build());

        controller.review(requestId, dto, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("userRequests:review:" + requestId));
    }
}
