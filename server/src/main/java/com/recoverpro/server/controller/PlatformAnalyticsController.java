package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.response.PlatformAnalyticsResponse;
import com.recoverpro.server.service.PlatformAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Platform-admin analytics: subscription/revenue, organization growth, and user
 * growth — all backed by real data. Drives the platform dashboard charts.
 */
@RestController
@RequestMapping("/api/v1/platform/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformAnalyticsController {

    private final PlatformAnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<ApiResponse<PlatformAnalyticsResponse>> getAnalytics(
            @RequestParam(defaultValue = "6") int months) {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.build(months)));
    }
}
