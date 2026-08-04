package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.dto.response.CaseTimelineResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.AllocationService;
import com.recoverpro.server.service.CaseTimelineService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * NOTE: unlike the equivalent tests on other controllers (e.g. PtpControllerTest), this does NOT
 * assert that a platform admin successfully elevates before fetching -- CasesController has no
 * PlatformAdminAccessGuard wiring at all, so a real platform-admin caller currently gets a 404
 * from allocations' RLS regardless of the isPlatformAdmin() early-return in assertSameTenant().
 * Not fixed: PLATFORM_ADMIN is deliberately excluded from every /app/** route (see App.tsx), so
 * no frontend page reaches this endpoint for that role -- same "flag, don't fix an unreachable
 * gap" call made throughout the endpoint audit for VisitSessionController/UnifiedDashboardController.
 */
@ExtendWith(MockitoExtension.class)
class CasesControllerTest {

    @Mock private CaseTimelineService caseTimelineService;
    @Mock private AllocationService allocationService;

    private CasesController newController() {
        return new CasesController(caseTimelineService, allocationService);
    }

    private UserPrincipal principalWithRole(String role) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    @Test
    void getTimeline_sameOrg_returnsTimeline() {
        CasesController controller = newController();
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN");
        doReturn(orgId).when(orgAdmin).getOrganizationId();

        when(allocationService.getAllocationById(allocationId))
                .thenReturn(AllocationResponse.builder().id(allocationId).organizationId(orgId).build());
        when(caseTimelineService.getTimeline(allocationId))
                .thenReturn(CaseTimelineResponse.builder().allocationId(allocationId).organizationId(orgId).events(List.of()).build());

        var response = controller.getTimeline(orgAdmin, allocationId);

        assertThat(response.getBody().getData().getAllocationId()).isEqualTo(allocationId);
    }

    @Test
    void getTimeline_differentOrg_throwsNotFound() {
        CasesController controller = newController();
        UUID allocationId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN");
        doReturn(UUID.randomUUID()).when(orgAdmin).getOrganizationId();

        when(allocationService.getAllocationById(allocationId))
                .thenReturn(AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());

        assertThatThrownBy(() -> controller.getTimeline(orgAdmin, allocationId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
