package com.recoverpro.server.controller;

import com.recoverpro.server.dto.request.UpdateSystemPromptRequest;
import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.response.SystemPromptResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.SystemPromptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/friday/admin/prompts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class SystemPromptAdminController {

    private final SystemPromptService systemPromptService;

    @GetMapping("/{promptKey}")
    public ResponseEntity<ApiResponse<SystemPromptResponse>> getPrompt(
            @PathVariable String promptKey) {

        log.debug("GET /api/v1/friday/admin/prompts/{}", promptKey);
        SystemPromptResponse response = systemPromptService.getActivePrompt(promptKey);
        return ResponseEntity.ok(ApiResponse.success(response, "System prompt fetched."));
    }

    @PutMapping("/{promptKey}")
    public ResponseEntity<ApiResponse<SystemPromptResponse>> updatePrompt(
            @PathVariable String promptKey,
            @Valid @RequestBody UpdateSystemPromptRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("PUT /api/v1/friday/admin/prompts/{} - updatedBy={}", promptKey, principal.getId());
        SystemPromptResponse response = systemPromptService.updatePrompt(promptKey, request, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "System prompt updated. New version: " + response.getVersion()));
    }
}