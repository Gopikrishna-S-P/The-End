package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.InvoiceResponse;
import com.recoverpro.server.dto.response.PlatformSubscriptionResponse;
import com.recoverpro.server.dto.response.RevenueTrendPointResponse;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.OrgSubscription.Plan;
import com.recoverpro.server.entity.OrgSubscription.Status;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.PlatformAnalyticsService;
import com.recoverpro.server.service.StripeService;
import com.stripe.exception.StripeException;
import com.stripe.model.Invoice;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Platform-admin cross-org subscription/billing view (BCR-5). SubscriptionController
 * (/api/v1/subscription) is deliberately self-service-only, scoped to the caller's own org --
 * this is the platform-wide counterpart, read-mostly plus one admin override action.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/platform/subscriptions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformSubscriptionController {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final OrgSubscriptionRepository subRepo;
    private final OrganizationRepository orgRepo;
    private final StripeService stripeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlatformSubscriptionResponse>>> list() {
        Instant now = Instant.now();
        List<PlatformSubscriptionResponse> result = orgRepo.findTenantOrgs().stream()
                .map(org -> toResponse(org, subRepo.findByOrgId(org.getId()).orElse(null), now))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/revenue-trend")
    public ResponseEntity<ApiResponse<List<RevenueTrendPointResponse>>> revenueTrend(
            @RequestParam(defaultValue = "monthly") String granularity,
            @RequestParam(defaultValue = "0") int periods) {

        List<OrgSubscription> subs = subRepo.findAll();
        String g = granularity == null ? "monthly" : granularity.toLowerCase();
        List<RevenueTrendPointResponse> result = switch (g) {
            case "daily"  -> dailyTrend(subs, periods > 0 ? periods : 30);
            case "yearly" -> yearlyTrend(subs, periods);
            default       -> monthlyTrend(subs, periods > 0 ? periods : 6);
        };
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{orgId}/invoices")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> invoices(@PathVariable UUID orgId) {
        OrgSubscription sub = subRepo.findByOrgId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found for org: " + orgId));

        if (sub.getStripeCustomerId() == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        try {
            List<Invoice> invoices = stripeService.listInvoices(sub.getStripeCustomerId());
            List<InvoiceResponse> result = invoices.stream().map(this::toInvoiceResponse).toList();
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (StripeException e) {
            log.error("Stripe invoice list error for org {}: {}", orgId, e.getMessage());
            throw new BusinessException("Could not fetch invoices from Stripe: " + e.getMessage());
        }
    }

    @PutMapping("/{orgId}/plan")
    public ResponseEntity<ApiResponse<PlatformSubscriptionResponse>> changePlan(
            @PathVariable UUID orgId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal caller) {

        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + orgId));

        String planName = body.get("plan");
        if (planName == null || planName.isBlank()) {
            throw new BusinessException("plan is required");
        }
        Plan plan;
        try {
            plan = Plan.valueOf(planName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Unknown plan: " + planName);
        }

        OrgSubscription sub = subRepo.findByOrgId(orgId).orElseGet(() ->
                OrgSubscription.builder().orgId(orgId).build());

        Plan previousPlan = sub.getPlan();
        sub.setPlan(plan);
        if (sub.getStatus() == null || sub.getStatus() == Status.INACTIVE) {
            sub.setStatus(Status.ACTIVE);
        }
        subRepo.save(sub);

        log.info("Platform admin {} force-changed org {} plan {} -> {}",
                caller.getId(), orgId, previousPlan, plan);

        return ResponseEntity.ok(ApiResponse.success(toResponse(org, sub, Instant.now())));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private PlatformSubscriptionResponse toResponse(Organization org, OrgSubscription sub, Instant now) {
        if (sub == null) {
            return PlatformSubscriptionResponse.builder()
                    .orgId(org.getId())
                    .orgName(org.getName())
                    .orgCode(org.getCode())
                    .status(Status.INACTIVE)
                    .plan(Plan.NONE)
                    .cancelAtPeriodEnd(false)
                    .createdAt(org.getCreatedAt())
                    .trialDaysLeft(0)
                    .build();
        }

        int trialDaysLeft = 0;
        if (sub.getTrialEndsAt() != null && sub.getStatus() == Status.TRIAL) {
            trialDaysLeft = (int) Math.max(0, ChronoUnit.DAYS.between(now, sub.getTrialEndsAt()));
        }

        return PlatformSubscriptionResponse.builder()
                .orgId(org.getId())
                .orgName(org.getName())
                .orgCode(org.getCode())
                .status(sub.getStatus())
                .plan(sub.getPlan())
                .stripeCustomerId(sub.getStripeCustomerId())
                .stripeSubscriptionId(sub.getStripeSubscriptionId())
                .trialEndsAt(sub.getTrialEndsAt())
                .currentPeriodEnd(sub.getCurrentPeriodEnd())
                .cancelAtPeriodEnd(sub.getCancelAtPeriodEnd())
                .createdAt(sub.getCreatedAt())
                .trialDaysLeft(trialDaysLeft)
                .build();
    }

    private InvoiceResponse toInvoiceResponse(Invoice inv) {
        return InvoiceResponse.builder()
                .id(inv.getId())
                .number(inv.getNumber())
                .status(inv.getStatus())
                .amountPaid(inv.getAmountPaid() == null ? 0 : inv.getAmountPaid())
                .currency(inv.getCurrency())
                .date(inv.getCreated() == null ? null : Instant.ofEpochSecond(inv.getCreated()).toString())
                .pdfUrl(inv.getInvoicePdf())
                .hostedUrl(inv.getHostedInvoiceUrl())
                .build();
    }

    private List<RevenueTrendPointResponse> monthlyTrend(List<OrgSubscription> subs, int periods) {
        int span = Math.max(1, Math.min(periods, 24));
        YearMonth current = YearMonth.now(IST);
        List<RevenueTrendPointResponse> out = new ArrayList<>(span);
        for (int i = span - 1; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            Instant periodEnd = ym.atEndOfMonth().atTime(23, 59, 59).atZone(IST).toInstant();
            String label = ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + ym.getYear();
            out.add(pointAt(subs, periodEnd, label));
        }
        return out;
    }

    private List<RevenueTrendPointResponse> dailyTrend(List<OrgSubscription> subs, int periods) {
        int span = Math.max(1, Math.min(periods, 90));
        LocalDate today = LocalDate.now(IST);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);
        List<RevenueTrendPointResponse> out = new ArrayList<>(span);
        for (int i = span - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Instant periodEnd = day.atTime(23, 59, 59).atZone(IST).toInstant();
            out.add(pointAt(subs, periodEnd, day.format(fmt)));
        }
        return out;
    }

    private List<RevenueTrendPointResponse> yearlyTrend(List<OrgSubscription> subs, int periods) {
        int currentYear = LocalDate.now(IST).getYear();
        int span = periods > 0 ? Math.max(1, Math.min(periods, 10)) : defaultYearSpan(subs, currentYear);
        List<RevenueTrendPointResponse> out = new ArrayList<>(span);
        for (int i = span - 1; i >= 0; i--) {
            int year = currentYear - i;
            Instant periodEnd = LocalDate.of(year, 12, 31).atTime(23, 59, 59).atZone(IST).toInstant();
            out.add(pointAt(subs, periodEnd, String.valueOf(year)));
        }
        return out;
    }

    private int defaultYearSpan(List<OrgSubscription> subs, int currentYear) {
        int earliestYear = subs.stream()
                .map(OrgSubscription::getCreatedAt)
                .filter(java.util.Objects::nonNull)
                .map(i -> i.atZone(IST).getYear())
                .min(Integer::compareTo)
                .orElse(currentYear);
        return Math.max(1, Math.min(currentYear - earliestYear + 1, 10));
    }

    /** Active MRR snapshot as of periodEnd -- same "cumulative active subs at period end"
     * semantic PlatformAnalyticsService already uses for its own revenue trend, just
     * generalized to day/month/year buckets and this endpoint's {month,revenue,count} shape. */
    private RevenueTrendPointResponse pointAt(List<OrgSubscription> subs, Instant periodEnd, String label) {
        long revenue = 0;
        long count = 0;
        for (OrgSubscription s : subs) {
            if (s.getStatus() == Status.ACTIVE && s.getCreatedAt() != null && !s.getCreatedAt().isAfter(periodEnd)) {
                revenue += PlatformAnalyticsService.amountOf(s);
                count++;
            }
        }
        return RevenueTrendPointResponse.builder().month(label).revenue(revenue).count(count).build();
    }
}
