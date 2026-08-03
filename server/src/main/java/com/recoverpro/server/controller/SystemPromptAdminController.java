package com.recoverpro.server.controller;

import com.recoverpro.server.dto.request.UpdateSystemPromptRequest;
import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.response.SystemPromptResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.SystemPromptService;
import com.recoverpro.server.service.UserActionAuditService;
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
    private final UserActionAuditService userActionAuditService;

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
        userActionAuditService.logUserAction(principal.getId(), "SYSTEM_PROMPT_UPDATED",
                "Updated system prompt \"" + promptKey + "\" to version " + response.getVersion()
                        + " (platform-wide, affects Lucien for every org)");
        return ResponseEntity.ok(ApiResponse.success(response, "System prompt updated. New version: " + response.getVersion()));
    }

    @DeleteMapping("/{promptKey}")
    public ResponseEntity<ApiResponse<Void>> deletePrompt(
            @PathVariable String promptKey,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("DELETE /api/v1/friday/admin/prompts/{} - by={}", promptKey, principal.getId());
        systemPromptService.deletePrompt(promptKey);
        userActionAuditService.logUserAction(principal.getId(), "SYSTEM_PROMPT_DELETED",
                "Deleted system prompt \"" + promptKey + "\" (platform-wide, Lucien now falls back to the hardcoded default for this key)");
        return ResponseEntity.ok(ApiResponse.success(null, "System prompt deleted."));
    }
}