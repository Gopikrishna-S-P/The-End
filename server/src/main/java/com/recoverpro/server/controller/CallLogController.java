package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.dto.request.CompleteCallRequest;
import com.recoverpro.server.dto.request.StartCallRequest;
import com.recoverpro.server.dto.response.CallLogResponse;
import com.recoverpro.server.dto.response.CallStartResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.CallLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/call-logs")
@RequiredArgsConstructor
public class CallLogController {

    private static final String SUBMITTERS = "hasAnyRole('FO','CALLER')";
    private static final String READERS =
            "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER')";

    private final CallLogService callLogService;
    private final PlatformAdminAccessGuard platformAdminAccessGuard;

    @PostMapping("/start")
    @PreAuthorize(SUBMITTERS)
    public ResponseEntity<ApiResponse<CallStartResponse>> start(
            @Valid @RequestBody StartCallRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID orgId = requireOrgId(principal);
        CallStartResponse response = callLogService.startCall(request.getAllocationId(), principal.getId(), orgId);
        log.info("POST /call-logs/start allocation={} agent={}", request.getAllocationId(), principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Call started", response));
    }

    @PostMapping("/{id}/recording")
    @PreAuthorize(SUBMITTERS)
    public ResponseEntity<ApiResponse<Void>> uploadRecording(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID orgId = requireOrgId(principal);
        callLogService.attachRecording(id, orgId, file);
        return ResponseEntity.ok(ApiResponse.of("Recording attached", null));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize(SUBMITTERS)
    public ResponseEntity<ApiResponse<CallLogResponse>> complete(
            @PathVariable UUID id,
            @Valid @RequestBody CompleteCallRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID orgId = requireOrgId(principal);
        CallLogResponse response = callLogService.completeCall(id, orgId, request);
        return ResponseEntity.ok(ApiResponse.of("Call completed", response));
    }

    @GetMapping("/allocation/{allocationId}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<CallLogResponse>>> getByAllocation(
            @PathVariable UUID allocationId,
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID effectiveOrgId = resolveOrgId(principal, orgId, reason, "callLogs:byAllocation:" + allocationId);
        return ResponseEntity.ok(ApiResponse.success(callLogService.getByAllocation(allocationId, effectiveOrgId)));
    }

    private UUID requireOrgId(UserPrincipal principal) {
        UUID orgId = principal.getOrganizationId();
        if (orgId == null) {
            throw new BusinessException("Caller has no organization context");
        }
        return orgId;
    }

    private static boolean isPlatformAdmin(UserPrincipal principal) {
        return principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
    }

    private UUID resolveOrgId(UserPrincipal principal, UUID requestedOrgId, String reason, String resource) {
        if (isPlatformAdmin(principal)) {
            if (requestedOrgId == null) {
                throw new BusinessException("Platform admins must specify ?orgId= to view a tenant's call logs.");
            }
            platformAdminAccessGuard.beginCrossOrgAccess(principal.getId(), requestedOrgId, reason, resource);
            return requestedOrgId;
        }
        return requireOrgId(principal);
    }
}
