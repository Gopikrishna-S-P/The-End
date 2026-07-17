package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateRestructureProposalRequest;
import com.recoverpro.server.dto.request.RestructureBorrowerAcceptRequest;
import com.recoverpro.server.dto.request.RestructureRejectRequest;
import com.recoverpro.server.dto.response.RestructureProposalResponse;
import com.recoverpro.server.enums.RestructureStatus;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RestructureProposalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/restructure-proposals")
@RequiredArgsConstructor
public class RestructureProposalController {

    private static final String READERS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER')";
    private static final String LEADS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')";
    private static final String LENDER =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')";

    private final RestructureProposalService restructureProposalService;

    @PostMapping
    @PreAuthorize(LEADS)
    public ResponseEntity<ApiResponse<RestructureProposalResponse>> draft(
            @Valid @RequestBody CreateRestructureProposalRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        RestructureProposalResponse response = restructureProposalService.draft(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Restructure proposal drafted", response));
    }

    @PostMapping("/{id}/propose-to-lender")
    @PreAuthorize(LEADS)
    public ResponseEntity<ApiResponse<RestructureProposalResponse>> proposeToLender(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {

        assertSameTenant(id, principal);
        return ResponseEntity.ok(ApiResponse.of("Sent to lender",
                restructureProposalService.proposeToLender(id, principal.getId())));
    }

    @PostMapping("/{id}/lender-approve")
    @PreAuthorize(LENDER)
    public ResponseEntity<ApiResponse<RestructureProposalResponse>> lenderApprove(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {

        assertSameTenant(id, principal);
        return ResponseEntity.ok(ApiResponse.of("Approved by lender",
                restructureProposalService.lenderApprove(id, principal.getId())));
    }

    @PostMapping("/{id}/lender-reject")
    @PreAuthorize(LENDER)
    public ResponseEntity<ApiResponse<RestructureProposalResponse>> lenderReject(
            @PathVariable UUID id,
            @Valid @RequestBody RestructureRejectRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        assertSameTenant(id, principal);
        return ResponseEntity.ok(ApiResponse.of("Rejected by lender",
                restructureProposalService.lenderReject(id, request, principal.getId())));
    }

    @PostMapping("/{id}/borrower-accept")
    @PreAuthorize(LEADS)
    public ResponseEntity<ApiResponse<RestructureProposalResponse>> borrowerAccept(
            @PathVariable UUID id,
            @RequestBody(required = false) RestructureBorrowerAcceptRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        assertSameTenant(id, principal);
        RestructureBorrowerAcceptRequest body =
                request != null ? request : new RestructureBorrowerAcceptRequest();
        return ResponseEntity.ok(ApiResponse.of("Accepted by borrower",
                restructureProposalService.borrowerAccept(id, body)));
    }

    @GetMapping("/{id}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<RestructureProposalResponse>> getById(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {

        RestructureProposalResponse response = restructureProposalService.getById(id);
        assertSameTenantOrg(response.getOrganizationId(), principal);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/allocation/{allocationId}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<RestructureProposalResponse>>> getByAllocation(
            @PathVariable UUID allocationId) {
        return ResponseEntity.ok(ApiResponse.success(
                restructureProposalService.getByAllocationId(allocationId)));
    }

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<PagedResponse<RestructureProposalResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) RestructureStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<RestructureProposalResponse> result = restructureProposalService.getByOrganization(
                principal.getOrganizationId(), status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    private void assertSameTenant(UUID proposalId, UserPrincipal principal) {
        RestructureProposalResponse current = restructureProposalService.getById(proposalId);
        assertSameTenantOrg(current.getOrganizationId(), principal);
    }

    private void assertSameTenantOrg(UUID resourceOrg, UserPrincipal principal) {
        boolean isPlatformAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
        if (isPlatformAdmin) return;

        if (resourceOrg == null || !resourceOrg.equals(principal.getOrganizationId())) {
            throw new ResourceNotFoundException("Restructure proposal not found");
        }
    }
}
