package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.request.IngestStatementRequest;
import com.recoverpro.server.dto.response.BankStatementRowResponse;
import com.recoverpro.server.dto.response.ReconciliationRunResponse;
import com.recoverpro.server.enums.ReconciliationOutcome;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.ReconciliationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Reconciliation endpoints (design-doc §5.5).
 *
 *   POST /api/v1/reconciliation/runs                ingest + match in one call
 *   GET  /api/v1/reconciliation/runs                list per org
 *   GET  /api/v1/reconciliation/runs/{id}           summary counters
 *   GET  /api/v1/reconciliation/runs/{id}/rows      drill into rows by outcome
 */
@RestController
@RequestMapping("/api/v1/reconciliation")
@RequiredArgsConstructor
@Slf4j
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @PostMapping("/runs")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<ReconciliationRunResponse>> ingest(
            @Valid @RequestBody IngestStatementRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/reconciliation/runs - source={}, asOf={}, rows={}",
                request.getSource(), request.getAsOfDate(), request.getRows().size());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(
                "Reconciliation run completed",
                reconciliationService.ingestAndMatch(request, principal.getId())));
    }

    @GetMapping("/runs")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<ReconciliationRunResponse>>> listRuns(
            @RequestParam UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isPlatformAdmin = isPlatformAdmin(principal);
        if (!isPlatformAdmin && !principal.getOrganizationId().equals(orgId)) {
            throw new com.recoverpro.server.common.exception.ResourceNotFoundException("Organization not found: " + orgId);
        }
        Page<ReconciliationRunResponse> result = reconciliationService.listRuns(
                orgId, PageRequest.of(page, Math.min(size, 50), Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @GetMapping("/runs/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<ReconciliationRunResponse>> getRun(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ReconciliationRunResponse run = reconciliationService.getRun(id);
        if (!isPlatformAdmin(principal) && !principal.getOrganizationId().equals(run.getOrganizationId())) {
            throw new com.recoverpro.server.common.exception.ResourceNotFoundException("Reconciliation run not found: " + id);
        }
        return ResponseEntity.ok(ApiResponse.success(run));
    }

    @GetMapping("/runs/{id}/rows")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<BankStatementRowResponse>>> listRows(
            @PathVariable UUID id,
            @RequestParam(required = false) ReconciliationOutcome outcome,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        ReconciliationRunResponse run = reconciliationService.getRun(id);
        if (!isPlatformAdmin(principal) && !principal.getOrganizationId().equals(run.getOrganizationId())) {
            throw new com.recoverpro.server.common.exception.ResourceNotFoundException("Reconciliation run not found: " + id);
        }
        int cappedSize = Math.min(size, 100);
        Page<BankStatementRowResponse> result = reconciliationService.listRows(
                id, outcome, PageRequest.of(page, cappedSize, Sort.by("createdAt").ascending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    private static boolean isPlatformAdmin(UserPrincipal principal) {
        return principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
    }
}