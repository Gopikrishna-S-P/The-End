package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.response.BorrowerRiskScoreResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Risk scoring & segmentation (design-doc §8).
 *
 *   GET  /api/v1/risk/borrowers/{id}            latest score (200 / 404 if never scored)
 *   POST /api/v1/risk/borrowers/{id}/score      recompute with no extra features
 *   POST /api/v1/risk/borrowers/{id}/score-with-features
 *                                               recompute with caller-supplied features
 */
@RestController
@RequestMapping("/api/v1/risk/borrowers")
@RequiredArgsConstructor
@Slf4j
public class RiskScoringController {

    private final RiskScoringService riskScoringService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<BorrowerRiskScoreResponse>> getLatest(@PathVariable UUID id) {
        BorrowerRiskScoreResponse latest = riskScoringService.getLatest(id);
        if (latest == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Borrower has not been scored yet"));
        }
        return ResponseEntity.ok(ApiResponse.success(latest));
    }

    @PostMapping("/{id}/score")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<BorrowerRiskScoreResponse>> score(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/risk/borrowers/{}/score", id);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Risk score computed",
                        riskScoringService.scoreBorrower(id, callerOrgId(principal))));
    }

    @PostMapping("/{id}/score-with-features")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<BorrowerRiskScoreResponse>> scoreWithFeatures(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> features,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/risk/borrowers/{}/score-with-features - keys={}",
                id, features == null ? null : features.keySet());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(
                "Risk score computed with supplied features",
                riskScoringService.scoreWithFeatures(id, features, callerOrgId(principal))));
    }

    private static UUID callerOrgId(UserPrincipal principal) {
        boolean isPlatformAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
        return isPlatformAdmin ? null : principal.getOrganizationId();
    }
}