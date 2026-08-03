package com.recoverpro.server.controller;

import com.recoverpro.server.dto.response.BorrowerRiskScoreResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RiskScoringService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: borrowers and borrower_risk_scores (V066) both went fail-closed in V040 with
 * no platform-admin RLS bypass -- score()/scoreWithFeatures() already pass callerOrgId=null for a
 * platform admin to intentionally skip RiskScoringServiceImpl's app-layer ownership check, but RLS
 * silently defeated that intent by filtering the borrower row (and the risk-score row's INSERT
 * check) before the app-layer logic could matter, the same bug class found repeatedly this pass.
 */
@ExtendWith(MockitoExtension.class)
class RiskScoringControllerTest {

    @Mock private RiskScoringService riskScoringService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private RiskScoringController newController() {
        return new RiskScoringController(riskScoringService, platformAdminAccessGuard);
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
    void getLatest_platformAdmin_elevatesBeforeFetching() {
        RiskScoringController controller = newController();
        UUID borrowerId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(riskScoringService.getLatest(borrowerId)).thenReturn(
                BorrowerRiskScoreResponse.builder().borrowerId(borrowerId).build());

        controller.getLatest(borrowerId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("risk:getLatest:" + borrowerId));
    }

    @Test
    void getLatest_nonPlatformAdmin_doesNotElevate() {
        RiskScoringController controller = newController();
        UUID borrowerId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", UUID.randomUUID());
        when(riskScoringService.getLatest(borrowerId)).thenReturn(null);

        controller.getLatest(borrowerId, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void score_platformAdmin_elevatesAndPassesNullOrgId() {
        RiskScoringController controller = newController();
        UUID borrowerId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(riskScoringService.scoreBorrower(eq(borrowerId), isNull())).thenReturn(
                BorrowerRiskScoreResponse.builder().borrowerId(borrowerId).build());

        controller.score(borrowerId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("risk:score:" + borrowerId));
    }

    @Test
    void score_orgAdmin_doesNotElevateAndPassesOwnOrgId() {
        RiskScoringController controller = newController();
        UUID borrowerId = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(riskScoringService.scoreBorrower(eq(borrowerId), eq(ownOrg))).thenReturn(
                BorrowerRiskScoreResponse.builder().borrowerId(borrowerId).build());

        controller.score(borrowerId, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void scoreWithFeatures_platformAdmin_elevates() {
        RiskScoringController controller = newController();
        UUID borrowerId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(riskScoringService.scoreWithFeatures(eq(borrowerId), any(), isNull())).thenReturn(
                BorrowerRiskScoreResponse.builder().borrowerId(borrowerId).build());

        controller.scoreWithFeatures(borrowerId, Map.of("ptp_kept_rate", 0.5), admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("risk:scoreWithFeatures:" + borrowerId));
    }
}
