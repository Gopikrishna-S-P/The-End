package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.request.CreatePaymentIntentRequest;
import com.recoverpro.server.dto.request.CreatePaymentLinkRequest;
import com.recoverpro.server.dto.response.PaymentIntentResponse;
import com.recoverpro.server.dto.response.PaymentLinkResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.PaymentLinkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Payment orchestration endpoints (design-doc §5).
 *
 *   /api/v1/payments/intents -- auth'd, idempotent
 *   /api/v1/payments/links   -- auth'd
 *   /p/{token}               -- public link resolution
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentLinkService paymentLinkService;

    @PostMapping("/api/v1/payments/intents")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> createIntent(
            @Valid @RequestBody CreatePaymentIntentRequest request,
            @RequestHeader(value = "Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/payments/intents - allocation={}, amount={}",
                request.getAllocationId(), request.getAmount());
        PaymentIntentResponse response = paymentLinkService.createIntent(
                request, principal.getId(), idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Payment intent created", response));
    }

    @GetMapping("/api/v1/payments/intents/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> getIntent(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        PaymentIntentResponse intent = paymentLinkService.getIntent(id);
        // Tenant assertion: PLATFORM_ADMIN can see any; everyone else scoped to their org.
        boolean isPlatformAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
        if (!isPlatformAdmin && !principal.getOrganizationId().equals(intent.getOrganizationId())) {
            throw new com.recoverpro.server.common.exception.ResourceNotFoundException("Intent not found: " + id);
        }
        return ResponseEntity.ok(ApiResponse.success(intent));
    }

    @PostMapping("/api/v1/payments/links")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN','FO')")
    public ResponseEntity<ApiResponse<PaymentLinkResponse>> createLink(
            @Valid @RequestBody CreatePaymentLinkRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /api/v1/payments/links - intent={}, rail={}",
                request.getIntentId(), request.getRail());
        PaymentLinkResponse response = paymentLinkService.createLink(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Payment link issued", response));
    }

    // Public link resolution at GET /p/{token} now lives in
    // PaymentLinkResolveController -- returns HTML/302 to drive the
    // borrower into their UPI app rather than a JSON payload.
}