package com.recoverpro.server.controller;

import com.recoverpro.server.common.SafeSort;
import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.dto.request.PtpFilterRequest;
import com.recoverpro.server.dto.request.UpdatePtpStatusRequest;
import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.exception.IdempotencyKeyConflictException;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.*;
import com.recoverpro.server.service.IdempotencyKeyService.IdempotencyResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/ptps")
@RequiredArgsConstructor
public class PtpController {

    private static final Map<String, String> SORTABLE_FIELDS = Map.of(
            "createdAt", "createdAt",
            "promiseDate", "promiseDate",
            "amount", "amount",
            "status", "status");

    private static final String SUBMITTERS = "hasAnyRole('FO','FO')";
    private static final String READERS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER','ORG_ADMIN')";
    private static final String LEADS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','ORG_ADMIN')";
    private static final String ADMINS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')";
    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";

    private final PtpService ptpService;
    private final IdempotencyKeyService idempotencyKeyService;
    private final AllocationService allocationService;
    private final com.recoverpro.server.repository.AllocationRepository allocationRepository;
    private final UserRepository userRepository;

    private boolean shouldProceed(String key, String scope, UUID id) {
        if (key == null || key.isBlank()) return true;

        IdempotencyResult result =
                idempotencyKeyService.tryClaim(scope, key, id);

        return switch (result) {
            case CLAIMED -> true;
            case REPLAY -> false;
            case CONFLICT -> throw new IdempotencyKeyConflictException(
                    "Idempotency-Key already used against a different PTP");
        };
    }

    @PostMapping
    @PreAuthorize(SUBMITTERS)
    public ResponseEntity<ApiResponse<PtpResponse>> createPtp(
            @Valid @RequestBody CreatePtpRequest request,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String key,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (request.getAllocationId() != null) {
            AllocationResponse alloc =
                    allocationService.getAllocationById(request.getAllocationId());
            assertSameTenant(alloc.getOrganizationId(), principal);
        }

        if (key != null && !key.isBlank()) {
            UUID existing = idempotencyKeyService.getCollectionId(key);
            if (existing != null) {
                log.info("Replay create key={} id={}", key, existing);
                return ResponseEntity.ok(ApiResponse.success(
                        ptpService.getPtpById(existing),
                        "PTP created successfully (replay)."));
            }
        }

        PtpResponse resp =
                ptpService.createPtp(request, principal.getId());

        if (key != null && !key.isBlank()) {
            idempotencyKeyService.registerKey(key, resp.getId());
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(resp, "PTP created successfully."));
    }

    @GetMapping("/allocation/{allocationId}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<PtpResponse>>> getByAllocation(
            @PathVariable UUID allocationId,
            @AuthenticationPrincipal UserPrincipal principal) {

        assertViaAllocation(allocationId, principal);
        AllocationResponse alloc = allocationService.getAllocationById(allocationId);

        List<java.util.UUID> allocationIds =
                (alloc.getLoanNumber() != null && !alloc.getLoanNumber().isBlank())
                        ? allocationRepository.findIdsByOrganizationIdAndLoanNumber(
                                alloc.getOrganizationId(), alloc.getLoanNumber())
                        : java.util.List.of(allocationId);

        List<PtpResponse> ptps = ptpService.getPtpsByAllocationIds(allocationIds);

        if (isOnlyFieldOfficer(principal)) {
            UUID user = principal.getId();
            ptps = ptps.stream().filter(p -> user.equals(p.getAgentId())).toList();
        }

        return ResponseEntity.ok(ApiResponse.success(ptps));
    }

    @GetMapping("/{id}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<PtpResponse>> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {

        PtpResponse resp = ptpService.getPtpById(id);
        assertViaAllocation(resp.getAllocationId(), principal);

        if (isOnlyFieldOfficer(principal) &&
                !principal.getId().equals(resp.getAgentId())) {
            throw new ResourceNotFoundException("PTP not found");
        }

        return ResponseEntity.ok(ApiResponse.success(resp));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<PtpHistoryResponse>>> getPtpHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {

        PtpResponse resp = ptpService.getPtpById(id);
        assertViaAllocation(resp.getAllocationId(), principal);

        if (isOnlyFieldOfficer(principal) &&
                !principal.getId().equals(resp.getAgentId())) {
            throw new ResourceNotFoundException("PTP not found");
        }

        return ResponseEntity.ok(ApiResponse.success(ptpService.getPtpHistory(id)));
    }

    @GetMapping("/allocation/{allocationId}/history")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<PtpHistoryResponse>>> getFullAllocationHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID allocationId) {

        assertViaAllocation(allocationId, principal);
        return ResponseEntity.ok(ApiResponse.success(ptpService.getFullAllocationHistory(allocationId)));
    }

    @GetMapping("/agents/{agentId}/statistics")
    @PreAuthorize(LEADS)
    public ResponseEntity<ApiResponse<PtpStatisticsResponse>> getAgentStatistics(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID agentId) {

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + agentId));

        if (!isPlatformAdmin(principal)) {
            UUID callerOrg = principal.getOrganizationId();
            if (callerOrg == null || !callerOrg.equals(agent.getOrganizationId())) {
                throw new ResourceNotFoundException("Agent not found: " + agentId);
            }
        }

        return ResponseEntity.ok(ApiResponse.success(ptpService.getAgentStatistics(agentId)));
    }

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<PagedResponse<PtpResponse>>> getAll(
            @AuthenticationPrincipal UserPrincipal principal,
            PtpFilterRequest filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String dir) {

        Sort sort = SafeSort.from(sortBy, dir, SORTABLE_FIELDS, "createdAt");

        Page<PtpResponse> result =
                ptpService.getAllPtps(filter, PageRequest.of(page, size, sort));

        if (!isPlatformAdmin(principal)) {
            UUID org = principal.getOrganizationId();
            UUID user = principal.getId();
            boolean foOnly = isOnlyFieldOfficer(principal);

            List<PtpResponse> filtered = result.getContent().stream()
                    .filter(p -> {
                        if (p.getAllocationId() == null) return false;
                        try {
                            AllocationResponse a =
                                    allocationService.getAllocationById(p.getAllocationId());
                            if (!org.equals(a.getOrganizationId())) return false;
                            return !foOnly || user.equals(p.getAgentId());
                        } catch (Exception e) {
                            return false;
                        }
                    }).toList();

            return ResponseEntity.ok(ApiResponse.success(
                    PagedResponse.<PtpResponse>builder()
                            .content(filtered)
                            .page(page)
                            .size(size)
                            .totalElements(result.getTotalElements())
                            .totalPages(result.getTotalPages())
                            .last(result.isLast())
                            .build()
            ));
        }

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(LEADS + " or " + SUBMITTERS)
    public ResponseEntity<ApiResponse<PtpResponse>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePtpStatusRequest req,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String key,
            @AuthenticationPrincipal UserPrincipal principal) {

        PtpResponse cur = ptpService.getPtpById(id);
        assertViaAllocation(cur.getAllocationId(), principal);

        if (!shouldProceed(key, "ptp.statusUpdate", id)) {
            return ResponseEntity.ok(ApiResponse.success(cur));
        }

        return ResponseEntity.ok(ApiResponse.success(
                ptpService.updatePtpStatus(id, req,
                        principal.getId(), principal.getEmail())
        ));
    }

    // ─── Tenant Guards ───────────────────────────────────────────

    private boolean isPlatformAdmin(UserPrincipal p) {
        return p.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
    }

    private boolean isOnlyFieldOfficer(UserPrincipal p) {
        boolean fo = p.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FO")
                        || a.getAuthority().equals("ROLE_FO"));

        boolean lead = p.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN")
                        || a.getAuthority().contains("MANAGER")
                        || a.getAuthority().contains("TL"));

        return fo && !lead;
    }

    private void assertSameTenant(UUID org, UserPrincipal p) {
        if (isPlatformAdmin(p)) return;

        if (org == null || !org.equals(p.getOrganizationId())) {
            throw new ResourceNotFoundException("PTP not found");
        }
    }

    private void assertViaAllocation(UUID allocId, UserPrincipal p) {
        if (allocId == null) return;

        AllocationResponse a;
        try {
            a = allocationService.getAllocationById(allocId);
        } catch (Exception e) {
            throw new ResourceNotFoundException("PTP not found");
        }

        assertSameTenant(a.getOrganizationId(), p);
    }
}