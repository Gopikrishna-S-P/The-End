package com.recoverpro.server.controller;

import com.recoverpro.server.dto.request.GenerateKfsRequest;
import com.recoverpro.server.dto.response.KeyFactStatementResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.KfsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Mirrors SettlementOfferControllerTest's isolation coverage for the same established pattern. */
@ExtendWith(MockitoExtension.class)
class KfsControllerTest {

    @Mock private KfsService kfsService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private KfsController newController() {
        return new KfsController(kfsService, platformAdminAccessGuard);
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
    void generate_platformAdmin_elevatesBeforeGenerating() {
        KfsController controller = newController();
        UUID proposalId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        GenerateKfsRequest request = new GenerateKfsRequest();
        request.setRestructureProposalId(proposalId);
        when(kfsService.generate(eq(proposalId), any())).thenReturn(
                KeyFactStatementResponse.builder().id(UUID.randomUUID()).restructureProposalId(proposalId).build());

        controller.generate(request, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(
                eq(admin.getId()), eq("kfs:generate:" + proposalId));
    }

    @Test
    void generate_orgAdmin_doesNotElevate() {
        KfsController controller = newController();
        UUID proposalId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", orgId);
        GenerateKfsRequest request = new GenerateKfsRequest();
        request.setRestructureProposalId(proposalId);
        when(kfsService.generate(eq(proposalId), any())).thenReturn(
                KeyFactStatementResponse.builder().id(UUID.randomUUID()).restructureProposalId(proposalId).build());

        controller.generate(request, orgAdmin);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void getById_platformAdmin_elevatesBeforeFetching() {
        KfsController controller = newController();
        UUID id = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(kfsService.getById(id)).thenReturn(
                KeyFactStatementResponse.builder().id(id).organizationId(UUID.randomUUID()).build());

        controller.getById(id, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("kfs:getById:" + id));
    }

    @Test
    void getById_nonPlatformAdmin_foreignOrg_throwsNotFound() {
        KfsController controller = newController();
        UUID id = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UUID foreignOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        when(kfsService.getById(id)).thenReturn(
                KeyFactStatementResponse.builder().id(id).organizationId(foreignOrg).build());

        assertThrows(com.recoverpro.server.common.exception.ResourceNotFoundException.class,
                () -> controller.getById(id, orgAdmin));
    }

    @Test
    void downloadPdf_platformAdmin_elevatesBeforeDownloading() {
        KfsController controller = newController();
        UUID id = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(kfsService.getById(id)).thenReturn(
                KeyFactStatementResponse.builder().id(id).organizationId(UUID.randomUUID()).build());
        when(kfsService.downloadPdf(id)).thenReturn(new byte[]{1, 2, 3});

        controller.downloadPdf(id, admin);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("kfs:downloadPdf:" + id));
    }

    @Test
    void getByRestructureProposal_nonPlatformAdmin_doesNotElevate() {
        KfsController controller = newController();
        UUID proposalId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UserPrincipal fo = principalWithRole("ROLE_FO", orgId);
        when(kfsService.getByRestructureProposalId(proposalId))
                .thenReturn(KeyFactStatementResponse.builder().id(UUID.randomUUID()).organizationId(orgId).build());

        controller.getByRestructureProposal(proposalId, fo);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }
}
