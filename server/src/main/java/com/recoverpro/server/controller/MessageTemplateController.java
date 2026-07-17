package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.entity.MessageTemplate;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.MessageTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Maker-checker template activation endpoints (design-doc §4.6).
 *
 * Templates are seeded by a maker (FIELD_AGENT or admin) directly into
 * the {@code message_templates} table; activation requires a different
 * checker via these endpoints. Surface deliberately admin-only -- the
 * security implication of an attacker-controlled template fanned out to
 * every borrower is too high to leave on a lower-trust role.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/message-templates")
@RequiredArgsConstructor
public class MessageTemplateController {

    private final MessageTemplateService messageTemplateService;

    @PostMapping("/{id}/submit-for-dlt")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<MessageTemplate>> submitForDlt(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(
                "Template submitted for DLT review",
                messageTemplateService.submitForDlt(id, principal == null ? null : principal.getId())));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<MessageTemplate>> activate(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(
                "Template activated",
                messageTemplateService.activate(id, principal == null ? null : principal.getId())));
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<MessageTemplate>> retire(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(
                "Template retired",
                messageTemplateService.retire(id, principal == null ? null : principal.getId())));
    }
}