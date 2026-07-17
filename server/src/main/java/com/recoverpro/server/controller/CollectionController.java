package com.recoverpro.server.controller;

import com.recoverpro.server.common.SafeSort;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.ApprovalRequest;
import com.recoverpro.server.dto.request.DepositRequest;
import com.recoverpro.server.dto.request.SubmitCollectionRequest;
import com.recoverpro.server.dto.response.AgentCollectionReport;
import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.response.CollectionResponse;
import com.recoverpro.server.dto.response.LedgerBalanceResponse;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import com.recoverpro.server.exception.IdempotencyKeyConflictException;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.CollectionLedgerService;
import com.recoverpro.server.service.CollectionService;
import com.recoverpro.server.service.IdempotencyKeyService;
import com.recoverpro.server.service.IdempotencyKeyService.IdempotencyResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
@Slf4j
public class CollectionController {

    private static final Map<String, String> SORTABLE_FIELDS = Map.of(
            "createdAt", "createdAt",
            "collectionDate", "collectionDate",
            "amount", "amount",
            "status", "status");

    private static final String SUBMITTERS =
            "hasAnyRole('FO')";

    private static final String READERS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER')";

    private static final String LEADS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')";

    private static final String ADMINS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')";

    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";

    private final CollectionService collectionService;
    private final IdempotencyKeyService idempotencyKeyService;
    private final com.recoverpro.server.service.AllocationService allocationService;
    private final com.recoverpro.server.repository.AllocationRepository allocationRepository;
    private final CollectionLedgerService collectionLedgerService;

    // ─────────────────────────────────────────────────────────────────────────

    private boolean shouldProceed(String idempotencyKey, String scope, UUID collectionId) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return true;
        }

        IdempotencyResult result =
                idempotencyKeyService.tryClaim(scope, idempotencyKey, collectionId);

        return switch (result) {
            case CLAIMED -> true;
            case REPLAY -> false;
            case CONFLICT -> throw new IdempotencyKeyConflictException(
                    "Idempotency-Key already used against a different collection");
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize(SUBMITTERS)
    public ResponseEntity<ApiResponse<CollectionResponse>> submit(
            @Valid @RequestBody SubmitCollectionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("POST /api/v1/collections - allocationId={}, mode={}",
                request.getAllocationId(), request.getPaymentMode());

        CollectionResponse response =
                collectionService.submit(request, principal.getId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Collection submitted successfully", response));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPROVAL
    // ─────────────────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/approval")
    @PreAuthorize(LEADS)
    public ResponseEntity<ApiResponse<CollectionResponse>> approve(
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalRequest request,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {

        CollectionResponse current = collectionService.getById(id);
        assertSameTenant(current.getOrganizationId(), principal);

        log.info("PATCH /api/v1/collections/{}/approval - action={}", id, request.getAction());

        if (!shouldProceed(idempotencyKey, "collection.approve", id)) {
            return ResponseEntity.ok(ApiResponse.of(
                    "Approval action processed (replay)",
                    collectionService.getById(id)));
        }

        CollectionResponse response =
                collectionService.approve(id, request, principal.getId());

        return ResponseEntity.ok(ApiResponse.of("Approval action processed", response));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEPOSIT
    // ─────────────────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/deposit")
    @PreAuthorize(LEADS)
    public ResponseEntity<ApiResponse<CollectionResponse>> markDeposited(
            @PathVariable UUID id,
            @Valid @RequestBody DepositRequest request,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {

        CollectionResponse current = collectionService.getById(id);
        assertSameTenant(current.getOrganizationId(), principal);

        log.info("PATCH /api/v1/collections/{}/deposit", id);

        if (!shouldProceed(idempotencyKey, "collection.deposit", id)) {
            return ResponseEntity.ok(ApiResponse.of(
                    "Collection marked as deposited (replay)",
                    collectionService.getById(id)));
        }

        CollectionResponse response =
                collectionService.markDeposited(id, request, principal.getId());

        return ResponseEntity.ok(ApiResponse.of("Collection marked as deposited", response));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<CollectionResponse>> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {

        CollectionResponse resp = collectionService.getById(id);
        assertSameTenant(resp.getOrganizationId(), principal);

        if (isOnlyFieldOfficer(principal)
                && !principal.getId().equals(resp.getSubmittedBy())) {
            throw new ResourceNotFoundException("Collection not found");
        }

        return ResponseEntity.ok(ApiResponse.success(resp));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<PagedResponse<CollectionResponse>>> getCollections(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(required = false) CollectionStatus status,
            @RequestParam(required = false) PaymentMode paymentMode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        UUID effectiveOrg = resolveOrgId(principal, orgId);
        if (effectiveOrg == null) {
            throw new BusinessException("No organization context for caller");
        }

        UUID effectiveAgent = isOnlyFieldOfficer(principal)
                ? principal.getId()
                : agentId;

        Sort sort = SafeSort.from(sortBy, sortDir, SORTABLE_FIELDS, "createdAt");

        Page<CollectionResponse> result =
                collectionService.getCollections(
                        effectiveOrg,
                        effectiveAgent,
                        status,
                        paymentMode,
                        fromDate,
                        toDate,
                        PageRequest.of(page, size, sort)
                );

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @GetMapping("/allocation/{allocationId}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<CollectionResponse>>> getByAllocation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID allocationId) {
        com.recoverpro.server.dto.response.AllocationResponse alloc =
                allocationService.getAllocationById(allocationId);
        assertSameTenant(alloc.getOrganizationId(), principal);

        List<java.util.UUID> allocationIds =
                (alloc.getLoanNumber() != null && !alloc.getLoanNumber().isBlank())
                        ? allocationRepository.findIdsByOrganizationIdAndLoanNumber(
                                alloc.getOrganizationId(), alloc.getLoanNumber())
                        : java.util.List.of(allocationId);

        List<CollectionResponse> result = collectionService.getByAllocationIds(allocationIds);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REPORTS
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/reports/agent/{agentId}/daily")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<AgentCollectionReport>> getDailyReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID agentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        if (isOnlyFieldOfficer(principal)
                && !principal.getId().equals(agentId)) {
            throw new ResourceNotFoundException("Report not found");
        }

        return ResponseEntity.ok(
                ApiResponse.success(collectionService.getDailyReport(agentId, date)));
    }

    @GetMapping("/reports/agent/{agentId}/all-time")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<AgentCollectionReport>> getAllTimeReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID agentId) {

        if (isOnlyFieldOfficer(principal)
                && !principal.getId().equals(agentId)) {
            throw new ResourceNotFoundException("Report not found");
        }

        return ResponseEntity.ok(
                ApiResponse.success(collectionService.getAllTimeReport(agentId)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LEDGER
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/ledger/balances")
    @PreAuthorize(LEADS)
    public ResponseEntity<ApiResponse<LedgerBalanceResponse>> getLedgerBalances(
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID orgId = principal.getOrganizationId();
        return ResponseEntity.ok(ApiResponse.success(collectionLedgerService.getBalances(orgId)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CANCEL
    // ─────────────────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/cancel")
    @PreAuthorize(ADMINS)
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable UUID id,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {

        CollectionResponse current = collectionService.getById(id);
        assertSameTenant(current.getOrganizationId(), principal);

        if (!shouldProceed(idempotencyKey, "collection.cancel", id)) {
            return ResponseEntity.ok(ApiResponse.of("Collection cancelled (replay)", null));
        }

        collectionService.cancelCollection(id, principal.getId());

        return ResponseEntity.ok(ApiResponse.of("Collection cancelled", null));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TENANT HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private boolean isPlatformAdmin(UserPrincipal p) {
        return p.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
    }

    private boolean isOnlyFieldOfficer(UserPrincipal p) {
        boolean hasFo = p.getAuthorities().stream()
                .anyMatch(a -> "ROLE_FO".equals(a.getAuthority())
                        || "ROLE_FO".equals(a.getAuthority()));

        boolean hasLead = p.getAuthorities().stream()
                .anyMatch(a -> "ROLE_TL".equals(a.getAuthority())
                        || "ROLE_MANAGER".equals(a.getAuthority())
                        || "ROLE_ORG_ADMIN".equals(a.getAuthority())
                        || "ROLE_PLATFORM_ADMIN".equals(a.getAuthority())
                        || "ROLE_ORG_ADMIN".equals(a.getAuthority())
                        || "ROLE_ORG_ADMIN".equals(a.getAuthority()));

        return hasFo && !hasLead;
    }

    private UUID resolveOrgId(UserPrincipal p, UUID requested) {
        if (isPlatformAdmin(p)) {
            return requested != null ? requested : p.getOrganizationId();
        }
        return p.getOrganizationId();
    }

    private void assertSameTenant(UUID resourceOrg, UserPrincipal principal) {
        if (isPlatformAdmin(principal)) return;

        if (resourceOrg == null
                || !resourceOrg.equals(principal.getOrganizationId())) {
            throw new ResourceNotFoundException("Collection not found");
        }
    }
}