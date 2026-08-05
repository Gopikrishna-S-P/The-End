package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.request.CreateDirectUserRequest;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.service.PlatformSetupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/platform")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformSetupController {

    private final PlatformSetupService setupService;

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createAdminUser(
            @Valid @RequestBody CreateDirectUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(setupService.createAdminUser(request)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> listAdminUsers() {
        return ResponseEntity.ok(ApiResponse.success(setupService.listAdminUsers()));
    }
}
