package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.request.DashboardFilterRequest;
import com.recoverpro.server.dto.response.UnifiedDashboardResponse;
import com.recoverpro.server.enums.DashboardRole;
import com.recoverpro.server.security.AuthenticatedUser;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.UnifiedDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Unified Dashboard", description = "Single dashboard endpoint — content gated by role and permissions")
@SecurityRequirement(name = "bearerAuth")
public class UnifiedDashboardController {

    private final UnifiedDashboardService unifiedDashboardService;

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/dashboard")
    @Operation(summary = "Get unified dashboard for the authenticated user")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Dashboard retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<ApiResponse<UnifiedDashboardResponse>> getDashboard(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @ModelAttribute DashboardFilterRequest filter) {

        DashboardRole dashboardRole = resolveRole(principal);
        UUID scopeId = dashboardRole == DashboardRole.PLATFORM_ADMIN ? null : principal.getOrganizationId();

        AuthenticatedUser caller = AuthenticatedUser.builder()
                .userId(principal.getId())
                .email(principal.getUsername())
                .role(dashboardRole)
                .scopeId(scopeId)
                .build();

        UnifiedDashboardResponse response = unifiedDashboardService.getDashboard(caller, filter);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    private DashboardRole resolveRole(UserPrincipal principal) {
        java.util.Set<String> authorities = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());

        if (authorities.contains("ROLE_PLATFORM_ADMIN")) return DashboardRole.PLATFORM_ADMIN;
        if (authorities.contains("ROLE_ORG_ADMIN"))      return DashboardRole.ORG_ADMIN;
        if (authorities.contains("ROLE_MANAGER"))        return DashboardRole.MANAGER;
        if (authorities.contains("ROLE_TL"))             return DashboardRole.TL;
        if (authorities.contains("ROLE_FO"))             return DashboardRole.FO;
        if (authorities.contains("ROLE_CALLER"))         return DashboardRole.CALLER;

        log.warn("Dashboard: no recognized role for userId={} authorities={}", principal.getId(), authorities);
        throw new AccessDeniedException("No recognized dashboard role assigned to this account");
    }
}
