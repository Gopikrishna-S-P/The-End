package com.recoverpro.server.controller;

import com.recoverpro.server.annotation.RequiresFeature;
import com.recoverpro.server.config.PlanFeatureMatrix;
import com.recoverpro.server.dto.request.ChatRequest;
import com.recoverpro.server.dto.request.ConfirmActionRequest;
import com.recoverpro.server.dto.request.StartSessionRequest;
import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.response.ChatMessageResponse;
import com.recoverpro.server.dto.response.ChatResponse;
import com.recoverpro.server.dto.response.SessionResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.LucienService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/lucien")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class LucienController {

    private final LucienService lucienService;

    @PostMapping("/sessions")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<SessionResponse>> startSession(
            @Valid @RequestBody StartSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/lucien/sessions -- agentId={}", principal.getId());
        SessionResponse session = lucienService.startSession(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(session, "Lucien session started."));
    }

    @PostMapping("/chat")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/lucien/chat -- sessionId={}", request.getSessionId());
        ChatResponse response = lucienService.chat(request, principal);
        return ResponseEntity.ok(ApiResponse.success(response, "Response generated."));
    }

    /**
     * Confirm (confirmed=true) or cancel (confirmed=false) a pending WRITE tool action.
     * Design-doc §6.3 — POST /sessions/{id}/confirm.
     */
    @PostMapping("/sessions/{sessionId}/confirm")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<ChatResponse>> confirmAction(
            @PathVariable String sessionId,
            @Valid @RequestBody ConfirmActionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/lucien/sessions/{}/confirm -- actionId={}, confirmed={}",
                sessionId, request.getActionId(), request.isConfirmed());
        ChatResponse response = lucienService.confirmAction(sessionId, request, principal);
        return ResponseEntity.ok(ApiResponse.success(response,
                request.isConfirmed() ? "Action executed." : "Action cancelled."));
    }

    @PostMapping("/sessions/{sessionId}/close")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<Void>> closeSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/lucien/sessions/{}/close", sessionId);
        lucienService.closeSession(sessionId, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Session closed."));
    }

    @GetMapping("/sessions/{sessionId}")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<SessionResponse>> getSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.debug("GET /api/v1/lucien/sessions/{}", sessionId);
        return ResponseEntity.ok(ApiResponse.success(
                lucienService.getSession(sessionId, principal), "Session fetched."));
    }

    @GetMapping("/sessions/{sessionId}/history")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getSessionHistory(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.debug("GET /api/v1/lucien/sessions/{}/history", sessionId);
        return ResponseEntity.ok(ApiResponse.success(
                lucienService.getSessionHistory(sessionId, principal), "History fetched."));
    }

    @GetMapping("/agents/{agentId}/sessions")
    @RequiresFeature(PlanFeatureMatrix.LUCIEN_AI)
    public ResponseEntity<ApiResponse<PagedResponse<SessionResponse>>> getAgentSessions(
            @PathVariable UUID agentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.debug("GET /api/v1/lucien/agents/{}/sessions", agentId);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SessionResponse> sessions = lucienService.getSessionsByAgent(agentId, pageable, principal);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(sessions), "Agent sessions fetched."));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("DELETE /api/v1/lucien/sessions/{} -- DPDP erasure", sessionId);
        lucienService.deleteSession(sessionId, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Session permanently deleted."));
    }
}
