package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.entity.AppNotification;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.security.jwt.SseTicketService;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.impl.NotificationSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSseService notificationSseService;
    private final SseTicketService sseTicketService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AppNotification>>> getUnread(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getUnreadForUser(principal.getId(), principal.getOrganizationId())));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getUnreadCount(principal.getId(), principal.getOrganizationId())));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllRead(principal.getId(), principal.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.of("All notifications marked as read", null));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        notificationService.markRead(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.of("Notification marked as read", null));
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<ApiResponse<Void>> dismiss(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        notificationService.dismiss(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.of("Notification dismissed", null));
    }

    @PatchMapping("/{id}/snooze")
    public ResponseEntity<ApiResponse<Void>> snooze(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant until) {
        notificationService.snooze(id, principal.getId(), until);
        return ResponseEntity.ok(ApiResponse.of("Notification snoozed", null));
    }

    /**
     * Issues a short-lived, single-use ticket for the SSE stream below -- called via a normal
     * authenticated fetch (Authorization header works fine here), then EventSource connects with
     * ?ticket= since it can't set that header itself. See SseTicketService.
     */
    @PostMapping("/stream/ticket")
    public ResponseEntity<ApiResponse<Map<String, String>>> issueStreamTicket(
            @AuthenticationPrincipal UserPrincipal principal) {
        String ticket = sseTicketService.issueTicket(principal.getEmail());
        return ResponseEntity.ok(ApiResponse.success(Map.of("ticket", ticket)));
    }

    @GetMapping("/stream")
    public SseEmitter stream(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationSseService.subscribe(principal.getId());
    }
}
