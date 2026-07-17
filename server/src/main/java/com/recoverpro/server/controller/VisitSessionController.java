package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.request.CloseSessionRequest;
import com.recoverpro.server.dto.request.PingRequest;
import com.recoverpro.server.dto.request.StartVisitRequest;
import com.recoverpro.server.dto.request.VisitTransitionRequest;
import com.recoverpro.server.dto.response.DistanceSummaryEntry;
import com.recoverpro.server.dto.response.TeamStatusEntry;
import com.recoverpro.server.dto.response.VisitSessionResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.VisitSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/visit-sessions")
@RequiredArgsConstructor
public class VisitSessionController {

    private final VisitSessionService visitSessionService;

    @PostMapping
    public ResponseEntity<ApiResponse<VisitSessionResponse>> start(
            @Valid @RequestBody StartVisitRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        VisitSessionResponse resp = visitSessionService.startVisit(
                principal.getId(), principal.getOrganizationId(), request);
        log.info("POST /visit-sessions agent={} allocation={}", principal.getId(), request.getAllocationId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Visit started", resp));
    }

    @PostMapping("/{id}/reached")
    public ResponseEntity<ApiResponse<VisitSessionResponse>> reached(
            @PathVariable UUID id,
            @RequestBody(required = false) VisitTransitionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (request == null) request = new VisitTransitionRequest();
        VisitSessionResponse resp = visitSessionService.markReached(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.of("Marked as reached", resp));
    }

    @PostMapping("/{id}/waiting")
    public ResponseEntity<ApiResponse<VisitSessionResponse>> waiting(
            @PathVariable UUID id,
            @RequestBody(required = false) VisitTransitionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (request == null) request = new VisitTransitionRequest();
        VisitSessionResponse resp = visitSessionService.markWaiting(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.of("Marked as waiting", resp));
    }

    @PostMapping("/{id}/ping")
    public ResponseEntity<ApiResponse<Map<String, Double>>> ping(
            @PathVariable UUID id,
            @Valid @RequestBody PingRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        double distance = visitSessionService.ping(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(Map.of("distanceMetres", distance)));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<ApiResponse<VisitSessionResponse>> close(
            @PathVariable UUID id,
            @RequestBody(required = false) CloseSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (request == null) request = new CloseSessionRequest();
        VisitSessionResponse resp = visitSessionService.closeSession(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.of("Visit closed", resp));
    }

    @PostMapping("/{id}/abandon")
    public ResponseEntity<ApiResponse<VisitSessionResponse>> abandon(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        VisitSessionResponse resp = visitSessionService.abandonSession(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.of("Visit abandoned", resp));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<VisitSessionResponse>> getActive(
            @AuthenticationPrincipal UserPrincipal principal) {
        Optional<VisitSessionResponse> active = visitSessionService.getActive(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(active.orElse(null)));
    }

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<VisitSessionResponse>>> getToday(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(visitSessionService.getToday(principal.getId())));
    }

    @GetMapping("/by-visit-log/{visitLogId}")
    public ResponseEntity<ApiResponse<VisitSessionResponse>> getByVisitLog(
            @PathVariable UUID visitLogId) {
        Optional<VisitSessionResponse> session = visitSessionService.getByVisitLogId(visitLogId);
        return ResponseEntity.ok(ApiResponse.success(session.orElse(null)));
    }

    @GetMapping("/team-status")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')")
    public ResponseEntity<ApiResponse<List<TeamStatusEntry>>> teamStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(
                visitSessionService.getTeamStatus(principal.getOrganizationId(), queryDate)));
    }

    @GetMapping("/distance-summary")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')")
    public ResponseEntity<ApiResponse<List<DistanceSummaryEntry>>> distanceSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(
                visitSessionService.getDistanceSummary(principal.getOrganizationId(), queryDate)));
    }
}
