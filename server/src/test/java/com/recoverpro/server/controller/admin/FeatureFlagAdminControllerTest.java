package com.recoverpro.server.controller.admin;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.dto.request.SetFeatureFlagRequest;
import com.recoverpro.server.entity.FeatureFlag;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeatureFlagAdminControllerTest {

    @Mock private FeatureFlagService featureFlagService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;
    @Mock private UserPrincipal orgAdmin;
    @Mock private UserPrincipal platformAdmin;

    private FeatureFlagAdminController controller;
    private UUID ownOrgId;
    private UUID otherOrgId;

    @BeforeEach
    void setUp() {
        controller = new FeatureFlagAdminController(featureFlagService, platformAdminAccessGuard);
        ownOrgId = UUID.randomUUID();
        otherOrgId = UUID.randomUUID();
    }

    private void asOrgAdmin() {
        Set<GrantedAuthority> authorities = Set.of(new SimpleGrantedAuthority("ROLE_ORG_ADMIN"));
        doReturn(authorities).when(orgAdmin).getAuthorities();
        lenient().when(orgAdmin.getOrganizationId()).thenReturn(ownOrgId);
        lenient().when(orgAdmin.getId()).thenReturn(UUID.randomUUID());
    }

    private void asPlatformAdmin() {
        Set<GrantedAuthority> authorities = Set.of(new SimpleGrantedAuthority("ROLE_PLATFORM_ADMIN"));
        doReturn(authorities).when(platformAdmin).getAuthorities();
        lenient().when(platformAdmin.getId()).thenReturn(UUID.randomUUID());
    }

    @Test
    void set_orgAdminSettingOwnOrgFlag_succeeds() {
        asOrgAdmin();
        SetFeatureFlagRequest request = new SetFeatureFlagRequest();
        request.setOrganizationId(ownOrgId);
        request.setFlagKey("LUCIEN_AI");
        request.setEnabled(true);

        controller.set(request, orgAdmin);

        verify(featureFlagService).set(eq(ownOrgId), eq("LUCIEN_AI"), eq(true), any(), any());
    }

    @Test
    void set_orgAdminSettingAnotherOrgFlag_throws() {
        asOrgAdmin();
        SetFeatureFlagRequest request = new SetFeatureFlagRequest();
        request.setOrganizationId(otherOrgId);
        request.setFlagKey("LUCIEN_AI");
        request.setEnabled(true);

        assertThatThrownBy(() -> controller.set(request, orgAdmin))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(featureFlagService);
    }

    @Test
    void set_orgAdminSettingGlobalFlag_throws() {
        asOrgAdmin();
        SetFeatureFlagRequest request = new SetFeatureFlagRequest();
        request.setOrganizationId(null);
        request.setFlagKey("LUCIEN_AI");
        request.setEnabled(true);

        assertThatThrownBy(() -> controller.set(request, orgAdmin))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(featureFlagService);
    }

    @Test
    void set_platformAdminSettingGlobalFlag_succeeds() {
        asPlatformAdmin();
        SetFeatureFlagRequest request = new SetFeatureFlagRequest();
        request.setOrganizationId(null);
        request.setFlagKey("LUCIEN_AI");
        request.setEnabled(false);

        controller.set(request, platformAdmin);

        verify(featureFlagService).set(isNull(), eq("LUCIEN_AI"), eq(false), any(), any());
    }

    @Test
    void set_platformAdminSettingAnyOrgFlag_succeeds() {
        asPlatformAdmin();
        SetFeatureFlagRequest request = new SetFeatureFlagRequest();
        request.setOrganizationId(otherOrgId);
        request.setFlagKey("ADVANCED_REPORTS");
        request.setEnabled(true);
        request.setReason("support ticket #123");

        controller.set(request, platformAdmin);

        verify(featureFlagService).set(eq(otherOrgId), eq("ADVANCED_REPORTS"), eq(true), any(), any());
        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                any(), eq(otherOrgId), eq("support ticket #123"), eq("admin-feature-flags:set"));
    }

    @Test
    void set_platformAdminSettingOwnOrgFlag_doesNotElevate() {
        asPlatformAdmin();
        lenient().when(platformAdmin.getOrganizationId()).thenReturn(ownOrgId);
        SetFeatureFlagRequest request = new SetFeatureFlagRequest();
        request.setOrganizationId(ownOrgId);
        request.setFlagKey("ADVANCED_REPORTS");
        request.setEnabled(true);

        controller.set(request, platformAdmin);

        verifyNoInteractions(platformAdminAccessGuard);
    }

    @Test
    void list_orgAdminListingOwnOrg_returnsMappedFlags() {
        asOrgAdmin();
        FeatureFlag flag = FeatureFlag.builder()
                .id(UUID.randomUUID())
                .organizationId(ownOrgId)
                .flagKey("LUCIEN_AI")
                .enabled(true)
                .source(FeatureFlag.FlagSource.PLAN)
                .build();
        when(featureFlagService.listForOrg(ownOrgId)).thenReturn(List.of(flag));

        var response = controller.list(ownOrgId, null, orgAdmin);

        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getFlagKey()).isEqualTo("LUCIEN_AI");
    }

    @Test
    void list_orgAdminListingAnotherOrg_throws() {
        asOrgAdmin();
        assertThatThrownBy(() -> controller.list(otherOrgId, null, orgAdmin))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void list_orgAdminListingGlobal_throws() {
        asOrgAdmin();
        assertThatThrownBy(() -> controller.list(null, null, orgAdmin))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void list_platformAdminListingGlobal_succeeds() {
        asPlatformAdmin();
        when(featureFlagService.listGlobal()).thenReturn(List.of());

        var response = controller.list(null, null, platformAdmin);

        assertThat(response.getBody().getData()).isEmpty();
        verify(featureFlagService).listGlobal();
    }

    @Test
    void list_platformAdminListingAnotherOrg_elevatesFirst() {
        asPlatformAdmin();
        when(featureFlagService.listForOrg(otherOrgId)).thenReturn(List.of());

        controller.list(otherOrgId, "support ticket #123", platformAdmin);

        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                any(), eq(otherOrgId), eq("support ticket #123"), eq("admin-feature-flags:list"));
    }

    @Test
    void deleteOverride_orgAdminOwnOrg_succeeds() {
        asOrgAdmin();
        controller.deleteOverride("LUCIEN_AI", ownOrgId, null, orgAdmin);
        verify(featureFlagService).deleteManualOverride(ownOrgId, "LUCIEN_AI");
    }

    @Test
    void deleteOverride_orgAdminAnotherOrg_throws() {
        asOrgAdmin();
        assertThatThrownBy(() -> controller.deleteOverride("LUCIEN_AI", otherOrgId, null, orgAdmin))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(featureFlagService);
    }

    @Test
    void deleteOverride_orgAdminGlobal_throws() {
        asOrgAdmin();
        assertThatThrownBy(() -> controller.deleteOverride("LUCIEN_AI", null, null, orgAdmin))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(featureFlagService);
    }

    @Test
    void deleteOverride_platformAdminGlobal_succeeds() {
        asPlatformAdmin();
        controller.deleteOverride("LUCIEN_AI", null, null, platformAdmin);
        verify(featureFlagService).deleteManualOverride(null, "LUCIEN_AI");
    }

    @Test
    void deleteOverride_platformAdminAnotherOrg_elevatesFirst() {
        asPlatformAdmin();
        controller.deleteOverride("LUCIEN_AI", otherOrgId, "support ticket #123", platformAdmin);
        verify(platformAdminAccessGuard).beginCrossOrgAccess(
                any(), eq(otherOrgId), eq("support ticket #123"), eq("admin-feature-flags:delete"));
    }
}
