package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.SettlementOfferResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.SettlementOfferService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Mirrors RestructureProposalControllerTest's isolation coverage for the same established pattern. */
@ExtendWith(MockitoExtension.class)
class SettlementOfferControllerTest {

    @Mock private SettlementOfferService settlementOfferService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private SettlementOfferController newController() {
        return new SettlementOfferController(settlementOfferService, platformAdminAccessGuard);
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
        SettlementOfferController controller = newController();
        UUID offerId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(settlementOfferService.getById(offerId)).thenReturn(
                SettlementOfferResponse.builder().id(offerId).organizationId(UUID.randomUUID()).build());

        controller.getById(offerId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(
                eq(admin.getId()), eq("settlementOffers:getById:" + offerId));
    }

    @Test
    void getById_nonPlatformAdmin_foreignOrg_throwsNotFound() {
        SettlementOfferController controller = newController();
        UUID offerId = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UUID foreignOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(settlementOfferService.getById(offerId)).thenReturn(
                SettlementOfferResponse.builder().id(offerId).organizationId(foreignOrg).build());

        assertThrows(ResourceNotFoundException.class, () -> controller.getById(offerId, orgAdmin));

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void list_orgAdmin_usesOwnOrgWithoutElevating() {
        SettlementOfferController controller = newController();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        Page<SettlementOfferResponse> page = new PageImpl<>(List.of());
        when(settlementOfferService.getByOrganization(eq(ownOrg), any(), any())).thenReturn(page);

        controller.list(orgAdmin, null, null, null, 0, 20);

        verify(platformAdminAccessGuard, never()).beginCrossOrgAccess(any(), any(), any(), any());
    }

    @Test
    void list_platformAdmin_withOrgId_elevatesWithReason() {
        SettlementOfferController controller = newController();
        UUID targetOrg = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        Page<SettlementOfferResponse> page = new PageImpl<>(List.of());
        when(settlementOfferService.getByOrganization(eq(targetOrg), any(), any())).thenReturn(page);

        controller.list(admin, targetOrg, "support case #9", null, 0, 20);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                eq(admin.getId()), eq(targetOrg), eq("support case #9"), eq("settlementOffers:list"));
    }

    @Test
    void approve_tlCaller_passesOrgLevelFalse() {
        SettlementOfferController controller = newController();
        UUID offerId = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal tl = principalWithRole("ROLE_TL", ownOrg);
        when(settlementOfferService.getById(offerId)).thenReturn(
                SettlementOfferResponse.builder().id(offerId).organizationId(ownOrg).build());
        when(settlementOfferService.approve(eq(offerId), any(), any(Boolean.class))).thenReturn(
                SettlementOfferResponse.builder().id(offerId).organizationId(ownOrg).build());

        controller.approve(offerId, tl);

        ArgumentCaptor<Boolean> orgLevelCaptor = ArgumentCaptor.forClass(Boolean.class);
        verify(settlementOfferService).approve(eq(offerId), any(), orgLevelCaptor.capture());
        assertThat(orgLevelCaptor.getValue()).isFalse();
    }

    @Test
    void approve_orgAdminCaller_passesOrgLevelTrue() {
        SettlementOfferController controller = newController();
        UUID offerId = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(settlementOfferService.getById(offerId)).thenReturn(
                SettlementOfferResponse.builder().id(offerId).organizationId(ownOrg).build());
        when(settlementOfferService.approve(eq(offerId), any(), any(Boolean.class))).thenReturn(
                SettlementOfferResponse.builder().id(offerId).organizationId(ownOrg).build());

        controller.approve(offerId, orgAdmin);

        ArgumentCaptor<Boolean> orgLevelCaptor = ArgumentCaptor.forClass(Boolean.class);
        verify(settlementOfferService).approve(eq(offerId), any(), orgLevelCaptor.capture());
        assertThat(orgLevelCaptor.getValue()).isTrue();
    }

    @Test
    void getByAllocation_platformAdmin_elevates() {
        SettlementOfferController controller = newController();
        UUID allocationId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(settlementOfferService.getByAllocationId(allocationId)).thenReturn(List.of());

        controller.getByAllocation(allocationId, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(
                eq(admin.getId()), eq("settlementOffers:byAllocation:" + allocationId));
    }
}
