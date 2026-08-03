package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateBorrowerRequest;
import com.recoverpro.server.dto.request.CreateErasureRequestRequest;
import com.recoverpro.server.dto.request.ExecuteErasureRequest;
import com.recoverpro.server.dto.request.GrantConsentRequest;
import com.recoverpro.server.dto.request.UpsertNomineeRequest;
import com.recoverpro.server.dto.response.BorrowerResponse;
import com.recoverpro.server.dto.response.ConsentArtifactResponse;
import com.recoverpro.server.dto.response.DataErasureRequestResponse;
import com.recoverpro.server.dto.response.NomineeResponse;
import com.recoverpro.server.enums.ConsentPurpose;
import com.recoverpro.server.enums.ConsentScope;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.BorrowerService;
import com.recoverpro.server.service.ConsentService;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/borrowers")
@RequiredArgsConstructor
@Slf4j
public class BorrowerController {

    private final BorrowerService borrowerService;
    private final ConsentService consentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<BorrowerResponse>> create(
            @Valid @RequestBody CreateBorrowerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Borrower created", borrowerService.create(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<BorrowerResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(borrowerService.getById(id)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<BorrowerResponse>>> list(
            @RequestParam UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<BorrowerResponse> result = borrowerService.list(orgId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @PostMapping("/{id}/consent")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<ConsentArtifactResponse>> grantConsent(
            @PathVariable UUID id,
            @Valid @RequestBody GrantConsentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/borrowers/{}/consent - purpose={}, scope={}", id, request.getPurpose(), request.getScope());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Consent recorded",
                        consentService.grant(id, request, principal.getId())));
    }

    @DeleteMapping("/{id}/consent/{purpose}/{scope}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<Void>> revokeConsent(
            @PathVariable UUID id,
            @PathVariable ConsentPurpose purpose,
            @PathVariable ConsentScope scope,
            @RequestParam(required = false) String reason) {
        consentService.revoke(id, purpose, scope, reason);
        return ResponseEntity.ok(ApiResponse.of("Consent revoked", null));
    }

    @GetMapping("/{id}/consents")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<List<ConsentArtifactResponse>>> listConsents(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(consentService.listForBorrower(id)));
    }

    @PostMapping("/{id}/erasure-request")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<DataErasureRequestResponse>> requestErasure(
            @PathVariable UUID id,
            @Valid @RequestBody CreateErasureRequestRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Erasure request received and queued for compliance review",
                        borrowerService.requestErasure(id, request, principal.getId())));
    }

    @GetMapping("/{id}/erasure-requests")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<List<DataErasureRequestResponse>>> listErasureRequests(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(borrowerService.listErasureRequests(id)));
    }

    @PatchMapping("/{id}/erasure-requests/{requestId}/execute")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<DataErasureRequestResponse>> executeErasure(
            @PathVariable UUID id,
            @PathVariable UUID requestId,
            @RequestBody(required = false) ExecuteErasureRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        DataErasureRequestResponse result = borrowerService.executeErasure(
                requestId, principal.getId(), request != null ? request.getComplianceNotes() : null);
        if (!id.equals(result.getBorrowerId())) {
            throw new ResourceNotFoundException("Erasure request not found: " + requestId);
        }
        return ResponseEntity.ok(ApiResponse.of("Erasure executed", result));
    }

    @PostMapping("/{id}/nominee")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<NomineeResponse>> upsertNominee(
            @PathVariable UUID id,
            @Valid @RequestBody UpsertNomineeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Nominee recorded", borrowerService.upsertNominee(id, request)));
    }

    @GetMapping("/{id}/nominee")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<NomineeResponse>> getNominee(@PathVariable UUID id) {
        return borrowerService.getNominee(id)
                .map(n -> ResponseEntity.ok(ApiResponse.success(n)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.of("No nominee recorded for this borrower", null)));
    }
}
