package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.FileProcessingErrorResponse;
import com.recoverpro.server.dto.response.FileUploadResponse;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/file-uploads")
@RequiredArgsConstructor
public class FileUploadController {

    private static final String READERS = "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')";
    private static final String WRITERS = "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')";

    private final FileUploadService fileUploadService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(WRITERS)
    public ResponseEntity<ApiResponse<FileUploadResponse>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID effectiveOrgId = resolveOrgId(principal, organizationId);
        if (effectiveOrgId == null) throw new BusinessException("Authenticated user has no organization context");
        log.info("POST /api/v1/file-uploads - filename: {}, orgId: {}, userId: {}",
                file.getOriginalFilename(), effectiveOrgId, principal.getId());
        FileUploadResponse response = fileUploadService.initiateUpload(file, effectiveOrgId, principal.getId());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.of("File upload initiated. Processing in background.", response));
    }

    @GetMapping("/{id}/status")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<FileUploadResponse>> getUploadStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        FileUploadResponse response = fileUploadService.getUploadStatus(id);
        assertSameTenant(response.getOrganizationId(), principal);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<PagedResponse<FileUploadResponse>>> getUploadsByOrganization(
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID effectiveOrgId = resolveOrgId(principal, organizationId);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(ApiResponse.success(
                fileUploadService.getUploadsByOrganization(effectiveOrgId, pageable)));
    }

    @GetMapping("/{id}/errors")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<PagedResponse<FileProcessingErrorResponse>>> getProcessingErrors(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        FileUploadResponse upload = fileUploadService.getUploadStatus(id);
        assertSameTenant(upload.getOrganizationId(), principal);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "rowNumber"));
        return ResponseEntity.ok(ApiResponse.success(fileUploadService.getProcessingErrors(id, pageable)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(WRITERS)
    public ResponseEntity<ApiResponse<Void>> deleteFileUpload(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        FileUploadResponse upload = fileUploadService.getUploadStatus(id);
        assertSameTenant(upload.getOrganizationId(), principal);
        fileUploadService.softDeleteFileUpload(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.of("File upload and all associated allocations deleted", null));
    }

    private boolean isPlatformAdmin(UserPrincipal p) {
        return p.getAuthorities().stream().anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
    }

    private UUID resolveOrgId(UserPrincipal p, UUID requested) {
        if (isPlatformAdmin(p)) {
            if (requested != null && !requested.equals(p.getOrganizationId())) {
                // Platform admin explicitly acting on another org's data: RLS's current_org_id()
                // is always the platform admin's own org (never a real tenant's), so a normal
                // session would see zero rows here regardless of `requested`. Flags this request's
                // connection checkouts to set app.is_platform_admin, which the file_uploads RLS
                // policy (V050) opts into; the WHERE organization_id = requested filter in
                // fileUploadService below remains the actual scoping mechanism.
                RlsOrgIdHolder.setBypass(true);
            }
            return requested != null ? requested : p.getOrganizationId();
        }
        return p.getOrganizationId();
    }

    private void assertSameTenant(UUID resourceOrg, UserPrincipal principal) {
        if (isPlatformAdmin(principal)) return;
        if (resourceOrg == null || !resourceOrg.equals(principal.getOrganizationId())) {
            throw new ResourceNotFoundException("FileUpload not found");
        }
    }
}
