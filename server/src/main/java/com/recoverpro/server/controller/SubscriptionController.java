package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.response.SubscriptionResponse;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.OrgSubscription.Plan;
import com.recoverpro.server.entity.OrgSubscription.Status;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
import com.recoverpro.server.service.StripeService;
import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final OrgSubscriptionRepository subRepo;
    private final StripeService stripeService;
    private final FeatureFlagService featureFlagService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN', 'MANAGER', 'TL', 'FO', 'CALLER', 'TRACER')")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> get(
            @AuthenticationPrincipal UserPrincipal caller) {

        UUID orgId = caller.getOrganizationId();
        OrgSubscription sub = subRepo.findByOrgId(orgId).orElse(null);

        if (sub == null) {
            return ResponseEntity.ok(ApiResponse.success(SubscriptionResponse.builder()
                    .status(Status.INACTIVE).plan(Plan.NONE)
                    .hasStripeCustomer(false).hasActiveSubscription(false).trialDaysLeft(0)
                    .build()));
        }

        int trialDaysLeft = 0;
        if (sub.getTrialEndsAt() != null && sub.getStatus() == Status.TRIAL) {
            trialDaysLeft = (int) Math.max(0, ChronoUnit.DAYS.between(Instant.now(), sub.getTrialEndsAt()));
        }

        boolean activeAccess = sub.getStatus() == Status.TRIAL
                || sub.getStatus() == Status.ACTIVE
                || sub.getStatus() == Status.PAST_DUE;

        return ResponseEntity.ok(ApiResponse.success(SubscriptionResponse.builder()
                .status(sub.getStatus()).plan(sub.getPlan())
                .trialEndsAt(sub.getTrialEndsAt())
                .currentPeriodEnd(sub.getCurrentPeriodEnd())
                .cancelAtPeriodEnd(sub.getCancelAtPeriodEnd())
                .hasStripeCustomer(sub.getStripeCustomerId() != null)
                .hasActiveSubscription(activeAccess)
                .trialDaysLeft(trialDaysLeft)
                .build()));
    }

    @PostMapping("/free")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<String>> selectFree(
            @AuthenticationPrincipal UserPrincipal caller) {

        UUID orgId = caller.getOrganizationId();
        OrgSubscription sub = subRepo.findByOrgId(orgId).orElseGet(() ->
                OrgSubscription.builder().orgId(orgId).build());
        sub.setPlan(Plan.STARTER);
        sub.setStatus(Status.ACTIVE);
        sub.setTrialEndsAt(null);
        sub.setCurrentPeriodEnd(null);
        sub.setCancelAtPeriodEnd(false);
        subRepo.save(sub);
        featureFlagService.provisionFlagsForPlan(orgId, Status.ACTIVE, Plan.STARTER);
        log.info("Org {} selected free Starter plan", orgId);
        return ResponseEntity.ok(ApiResponse.success("Free plan activated"));
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> checkout(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal caller) {

        String plan = body.getOrDefault("plan", "STARTER");
        UUID orgId = caller.getOrganizationId();
        try {
            String url = stripeService.createCheckoutUrl(orgId, plan);
            return ResponseEntity.ok(ApiResponse.success(Map.of("url", url)));
        } catch (StripeException e) {
            log.error("Stripe checkout error for org {}: {}", orgId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.of("Stripe error: " + e.getMessage(), null));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.of(e.getMessage(), null));
        }
    }

    @PostMapping("/portal")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> portal(
            @AuthenticationPrincipal UserPrincipal caller) {

        UUID orgId = caller.getOrganizationId();
        try {
            String url = stripeService.createPortalUrl(orgId);
            return ResponseEntity.ok(ApiResponse.success(Map.of("url", url)));
        } catch (StripeException e) {
            log.error("Stripe portal error for org {}: {}", orgId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.of("Stripe error: " + e.getMessage(), null));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.of(e.getMessage(), null));
        }
    }
}
