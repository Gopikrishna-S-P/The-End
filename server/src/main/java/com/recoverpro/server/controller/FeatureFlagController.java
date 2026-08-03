package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feature-flags")
@RequiredArgsConstructor
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;

    public record FeatureFlagResponse(String flagKey, boolean enabled) {}

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<ApiResponse<List<FeatureFlagResponse>>> getForOrg(
            @AuthenticationPrincipal UserPrincipal caller) {
        List<FeatureFlagResponse> flags = featureFlagService.listResolvedForOrg(caller.getOrganizationId())
                .stream()
                .map(f -> new FeatureFlagResponse(f.getFlagKey(), Boolean.TRUE.equals(f.getEnabled())))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(flags));
    }
}
