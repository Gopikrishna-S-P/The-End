package com.recoverpro.server.controller.admin;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.dto.request.SetFeatureFlagRequest;
import com.recoverpro.server.dto.response.FeatureFlagAdminResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Write/inspect surface for feature flags -- separate from the read-only
 * self-service {@link com.recoverpro.server.controller.FeatureFlagController},
 * which only ever exposed the caller's own org's flags with no admin verbs.
 *
 * PLATFORM_ADMIN may target any organization or the global (organizationId=null)
 * scope. ORG_ADMIN may only target their own organization.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/feature-flags")
@RequiredArgsConstructor
public class FeatureFlagAdminController {

    private final FeatureFlagService featureFlagService;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<FeatureFlagAdminResponse>>> list(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal UserPrincipal caller) {

        List<com.recoverpro.server.entity.FeatureFlag> flags;
        if (organizationId == null) {
            requirePlatformAdmin(caller, "list global feature flags");
            flags = featureFlagService.listGlobal();
        } else {
            requireScopeAccess(caller, organizationId);
            flags = featureFlagService.listForOrg(organizationId);
        }

        return ResponseEntity.ok(ApiResponse.success(
                flags.stream().map(FeatureFlagAdminResponse::from).toList()));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')")
    public ResponseEntity<ApiResponse<String>> set(
            @Valid @RequestBody SetFeatureFlagRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {

        if (request.getOrganizationId() == null) {
            requirePlatformAdmin(caller, "set a global feature flag");
        } else {
            requireScopeAccess(caller, request.getOrganizationId());
        }

        featureFlagService.set(
                request.getOrganizationId(), request.getFlagKey(), request.getEnabled(),
                request.getDescription(), caller.getId());
        return ResponseEntity.ok(ApiResponse.success("Feature flag updated"));
    }

    @DeleteMapping("/{flagKey}")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteOverride(
            @PathVariable String flagKey,
            @RequestParam UUID organizationId,
            @AuthenticationPrincipal UserPrincipal caller) {

        requireScopeAccess(caller, organizationId);
        featureFlagService.deleteManualOverride(organizationId, flagKey);
        return ResponseEntity.ok(ApiResponse.success("Manual override removed, reverted to plan default"));
    }

    private boolean isPlatformAdmin(UserPrincipal p) {
        return p.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
    }

    private void requirePlatformAdmin(UserPrincipal caller, String action) {
        if (!isPlatformAdmin(caller)) {
            throw new BusinessException("Only a platform admin may " + action);
        }
    }

    private void requireScopeAccess(UserPrincipal caller, UUID organizationId) {
        if (isPlatformAdmin(caller)) return;
        if (!organizationId.equals(caller.getOrganizationId())) {
            throw new BusinessException("Cannot manage feature flags for another organization");
        }
    }
}
