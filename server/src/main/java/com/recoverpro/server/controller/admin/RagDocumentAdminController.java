package com.recoverpro.server.controller.admin;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.response.RagDocumentResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RagDocumentService;
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

/** Platform compliance document library management -- PLATFORM_ADMIN only. */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/rag-documents")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class RagDocumentAdminController {

    private final RagDocumentService ragDocumentService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<RagDocumentResponse>> upload(
            @RequestParam MultipartFile file,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("POST /api/v1/admin/rag-documents - title={}", title);
        RagDocumentResponse response = ragDocumentService.upload(file, title, description, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Document uploaded, processing started", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RagDocumentResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(ragDocumentService.list()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> supersede(@PathVariable UUID id) {
        ragDocumentService.supersede(id);
        return ResponseEntity.ok(ApiResponse.success("Document deactivated"));
    }
}
