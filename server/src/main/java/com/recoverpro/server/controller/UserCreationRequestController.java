package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.request.CreateUserRequestDto;
import com.recoverpro.server.dto.request.ReviewRequestDto;
import com.recoverpro.server.dto.response.UserCreationRequestResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.UserCreationRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user-requests")
@RequiredArgsConstructor
public class UserCreationRequestController {

    private final UserCreationRequestService service;

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<UserCreationRequestResponse>> submit(
            @Valid @RequestBody CreateUserRequestDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(service.submit(dto, principal), "Request submitted for approval"));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<UserCreationRequestResponse>>> listPending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        Page<UserCreationRequestResponse> result = service.listPendingForApprover(
                principal, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<UserCreationRequestResponse>>> listMine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        Page<UserCreationRequestResponse> result = service.listMyRequests(
                principal, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @GetMapping("/pending-count")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Long>> pendingCount(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.countPendingForApprover(principal)));
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserCreationRequestResponse>> review(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewRequestDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.review(id, dto, principal)));
    }
}
