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
import com.recoverpro.server.entity.PlatformInvoice;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PlatformInvoiceRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
import com.recoverpro.server.service.PlatformAnalyticsService;
import com.recoverpro.server.service.StripeService;
import com.recoverpro.server.service.StripeWebhookService;
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
import java.time.format.DateTimeParseException;
import java.time.format.TextStyle;
import java.math.BigInteger;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
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
    private final PlatformInvoiceRepository invoiceRepo;
    private final StripeWebhookService stripeWebhookService;
    private final FeatureFlagService featureFlagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlatformSubscriptionResponse>>> list() {
        Instant now = Instant.now();

        // Grouped once rather than per row: this lists every tenant org, so a
        // per-org revenue lookup would be an N+1 across the whole tenant base.
        Map<UUID, Long> revenueByOrg = new HashMap<>();
        for (Object[] row : invoiceRepo.findLifetimeRevenueByOrg()) {
            revenueByOrg.put((UUID) row[0], toLong(row[1]));
        }

        List<PlatformSubscriptionResponse> result = orgRepo.findTenantOrgs().stream()
                .map(org -> toResponse(org, subRepo.findByOrgId(org.getId()).orElse(null), now,
                        revenueByOrg.getOrDefault(org.getId(), 0L)))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * @param basis {@code contracted} (default) keeps the original semantic --
     *        active subs x plan amount, an MRR snapshot at each period end, in
     *        RUPEES. {@code collected} sums invoices Stripe actually settled, in
     *        PAISE. They answer different questions and differ whenever a charge
     *        fails, prorates or is refunded, so the caller must choose; the
     *        default is unchanged to avoid silently redefining an existing chart.
     */
    @GetMapping("/revenue-trend")
    public ResponseEntity<ApiResponse<List<RevenueTrendPointResponse>>> revenueTrend(
            @RequestParam(defaultValue = "monthly") String granularity,
            @RequestParam(defaultValue = "0") int periods,
            @RequestParam(defaultValue = "contracted") String basis) {

        String g = granularity == null ? "monthly" : granularity.toLowerCase();

        if ("collected".equalsIgnoreCase(basis)) {
            return ResponseEntity.ok(ApiResponse.success(collectedTrend(g, periods)));
        }
        if (!"contracted".equalsIgnoreCase(basis)) {
            throw new BusinessException("Unknown basis: " + basis + " (expected contracted or collected)");
        }

        List<OrgSubscription> subs = subRepo.findAll();
        List<RevenueTrendPointResponse> result = switch (g) {
            case "daily"  -> dailyTrend(subs, periods > 0 ? periods : 30);
            case "yearly" -> yearlyTrend(subs, periods);
            default       -> monthlyTrend(subs, periods > 0 ? periods : 6);
        };
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Invoice history, served from the local mirror.
     *
     * <p>Falls back to a live Stripe call when the mirror holds nothing for this
     * org, so the endpoint behaves exactly as before on any org whose invoices
     * predate the mirror and have not been backfilled. Once
     * {@code POST /backfill-invoices} has run, the fallback stops firing.
     */
    @GetMapping("/{orgId}/invoices")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> invoices(@PathVariable UUID orgId) {
        OrgSubscription sub = subRepo.findByOrgId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found for org: " + orgId));

        if (invoiceRepo.existsByOrgId(orgId)) {
            List<InvoiceResponse> result = invoiceRepo.findByOrgIdOrderByIssuedAtDesc(orgId).stream()
                    .map(PlatformSubscriptionController::toInvoiceResponse)
                    .toList();
            return ResponseEntity.ok(ApiResponse.success(result));
        }

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

    /**
     * Grants an org a plan it has not paid for, or replaces an existing grant.
     *
     * <p>Writes only the comp columns, never {@code plan} or {@code status}.
     * Those belong to Stripe for a billed org and are rewritten on the next
     * subscription webhook; a comp is a parallel channel the webhook never
     * touches, so a grant survives renewals, payments and card updates.
     *
     * <p>Revenue is untouched by design -- collected figures come from settled
     * invoices, so a comped org keeps contributing zero rather than inflating
     * MRR with money nobody paid.
     *
     * <p>Body: {@code plan} (required), {@code until} (ISO-8601, optional --
     * omit for open-ended), {@code reason} (required).
     */
    @PutMapping("/{orgId}/comp")
    public ResponseEntity<ApiResponse<PlatformSubscriptionResponse>> grantComp(
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
        if (plan == Plan.NONE) {
            throw new BusinessException("Comping NONE grants nothing. Remove the comp instead.");
        }

        // Required so the next admin who finds this grant can tell why it exists.
        String reason = body.get("reason");
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("reason is required");
        }

        Instant until = null;
        String untilRaw = body.get("until");
        if (untilRaw != null && !untilRaw.isBlank()) {
            try {
                until = Instant.parse(untilRaw);
            } catch (DateTimeParseException e) {
                throw new BusinessException("until must be an ISO-8601 instant, e.g. 2026-12-31T00:00:00Z");
            }
            if (!until.isAfter(Instant.now())) {
                throw new BusinessException("until must be in the future");
            }
        }

        OrgSubscription sub = subRepo.findByOrgId(orgId).orElseGet(() ->
                OrgSubscription.builder().orgId(orgId).build());

        sub.setCompedPlan(plan);
        sub.setCompedUntil(until);
        sub.setCompedReason(reason.trim());
        sub.setCompedBy(caller.getId());
        sub.setCompedAt(Instant.now());
        subRepo.save(sub);

        featureFlagService.provisionFlagsFor(sub);

        log.info("Platform admin {} comped org {} to {} until {} ({})",
                caller.getId(), orgId, plan, until == null ? "open-ended" : until, reason);

        return ResponseEntity.ok(ApiResponse.success(
                toResponse(org, sub, Instant.now(), invoiceRepo.sumCollectedByOrg(orgId))));
    }

    /**
     * Ends a grant and drops the org back to whatever it is actually entitled to.
     *
     * <p>Clears {@code comped_plan} so entitlement falls through to the Stripe
     * plan, then re-provisions -- otherwise the org would keep the comped
     * features until some unrelated event happened to re-provision it.
     */
    @DeleteMapping("/{orgId}/comp")
    public ResponseEntity<ApiResponse<PlatformSubscriptionResponse>> revokeComp(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal UserPrincipal caller) {

        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + orgId));
        OrgSubscription sub = subRepo.findByOrgId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found for org: " + orgId));

        if (sub.getCompedPlan() == null) {
            throw new BusinessException("This org has no comp to remove.");
        }

        Plan previous = sub.getCompedPlan();
        sub.setCompedPlan(null);
        sub.setCompedUntil(null);
        sub.setCompedReason(null);
        sub.setCompedBy(null);
        sub.setCompedAt(null);
        subRepo.save(sub);

        featureFlagService.provisionFlagsFor(sub);

        log.info("Platform admin {} removed {} comp from org {}", caller.getId(), previous, orgId);

        return ResponseEntity.ok(ApiResponse.success(
                toResponse(org, sub, Instant.now(), invoiceRepo.sumCollectedByOrg(orgId))));
    }

    /**
     * One-shot import of historical Stripe invoices into the mirror.
     *
     * <p>Manual rather than run on boot: it walks the Stripe API once per
     * customer and must never fire as a side effect of a restart. Idempotent --
     * the upsert is keyed on the Stripe invoice id, so re-running refreshes
     * rows rather than duplicating them.
     */
    @PostMapping("/backfill-invoices")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> backfillInvoices(
            @AuthenticationPrincipal UserPrincipal caller) {

        int imported = 0;
        for (OrgSubscription sub : subRepo.findAll()) {
            if (sub.getStripeCustomerId() == null) {
                continue;
            }
            try {
                for (Invoice invoice : stripeService.listInvoices(sub.getStripeCustomerId())) {
                    stripeWebhookService.upsertInvoice(invoice);
                    imported++;
                }
            } catch (StripeException e) {
                log.error("Invoice backfill failed for org {} (customer {}): {}",
                        sub.getOrgId(), sub.getStripeCustomerId(), e.getMessage());
            }
        }
        log.info("Platform admin {} ran invoice backfill: {} invoices mirrored", caller.getId(), imported);
        return ResponseEntity.ok(ApiResponse.success(Map.of("imported", imported)));
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

        if (sub.getStripeSubscriptionId() != null) {
            // Stripe owns `plan` for a billed org: handleSubscriptionUpserted rewrites
            // it from the subscription on the next customer.subscription.updated event,
            // so a write here would be reverted at an unpredictable moment. Comps are
            // the supported way to grant access without changing what Stripe bills.
            throw new BusinessException(
                    "This org is billed through Stripe, so its plan is controlled there. "
                    + "To grant access without charging them, add a comp instead.");
        }

        Plan previousPlan = sub.getPlan();
        sub.setPlan(plan);
        if (sub.getStatus() == null || sub.getStatus() == Status.INACTIVE) {
            sub.setStatus(Status.ACTIVE);
        }
        subRepo.save(sub);

        // Without this the plan label changes and the entitlements do not: features are
        // gated on feature-flag rows provisioned from PlanFeatureMatrix, not on the plan
        // column. Every webhook path re-provisioned; this one silently did not.
        featureFlagService.provisionFlagsFor(sub);

        log.info("Platform admin {} force-changed org {} plan {} -> {}",
                caller.getId(), orgId, previousPlan, plan);

        return ResponseEntity.ok(ApiResponse.success(
                toResponse(org, sub, Instant.now(), invoiceRepo.sumCollectedByOrg(orgId))));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private PlatformSubscriptionResponse toResponse(Organization org, OrgSubscription sub, Instant now,
                                                    long lifetimeRevenue) {
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
                    .lifetimeRevenue(lifetimeRevenue)
                    .effectivePlan(Plan.NONE)
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
                .lifetimeRevenue(lifetimeRevenue)
                .compedPlan(sub.getCompedPlan())
                .compedUntil(sub.getCompedUntil())
                .compedReason(sub.getCompedReason())
                .compedAt(sub.getCompedAt())
                // activeComp() is null once compedUntil has passed, so an expired grant
                // stops driving entitlement without anything having to clear the row.
                .effectivePlan(sub.activeComp() != null ? sub.activeComp() : sub.getPlan())
                .build();
    }

    /** Mirror row -> DTO. Same shape as the live-Stripe mapping below, so callers cannot tell them apart. */
    private static InvoiceResponse toInvoiceResponse(PlatformInvoice inv) {
        return InvoiceResponse.builder()
                .id(inv.getStripeInvoiceId())
                .number(inv.getNumber())
                .status(inv.getStatus())
                .amountPaid(inv.getAmountPaid() == null ? 0 : inv.getAmountPaid())
                .currency(inv.getCurrency())
                .date(inv.getIssuedAt() == null ? null : inv.getIssuedAt().toString())
                .pdfUrl(inv.getInvoicePdfUrl())
                .hostedUrl(inv.getHostedInvoiceUrl())
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

    /**
     * Cash actually settled per bucket, zero-filled, in PAISE.
     *
     * <p>Zero-filling is not cosmetic: the SQL returns only buckets that had a
     * settled invoice, so a chart built straight off it would draw a rising line
     * through a revenue gap instead of showing the gap.
     *
     * <p>Labels match the contracted trend's format exactly ("Jan 2026", "07 Feb",
     * "2026") so the two bases can be swapped underneath the same chart.
     */
    private List<RevenueTrendPointResponse> collectedTrend(String granularity, int periods) {
        record Bucket(String pgUnit, int span, int max) { }

        Bucket b = switch (granularity) {
            case "daily"  -> new Bucket("day",   periods > 0 ? periods : 30, 90);
            case "yearly" -> new Bucket("year",  periods > 0 ? periods : 5,  10);
            default       -> new Bucket("month", periods > 0 ? periods : 6,  24);
        };
        int span = Math.max(1, Math.min(b.span(), b.max()));

        LocalDate today = LocalDate.now(IST);
        LocalDate start = switch (granularity) {
            case "daily"  -> today.minusDays(span - 1L);
            case "yearly" -> today.withDayOfYear(1).minusYears(span - 1L);
            default       -> today.withDayOfMonth(1).minusMonths(span - 1L);
        };

        Map<LocalDate, long[]> byBucket = new HashMap<>();
        for (Object[] row : invoiceRepo.findCollectedRevenueBucketed(
                b.pgUnit(), start.atStartOfDay(IST).toInstant())) {
            LocalDate bucket = toLocalDate(row[0]);
            if (bucket != null) {
                byBucket.put(bucket, new long[]{ toLong(row[1]), toLong(row[2]) });
            }
        }

        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);
        List<RevenueTrendPointResponse> out = new ArrayList<>(span);
        for (int i = 0; i < span; i++) {
            LocalDate bucket = switch (granularity) {
                case "daily"  -> start.plusDays(i);
                case "yearly" -> start.plusYears(i);
                default       -> start.plusMonths(i);
            };
            String label = switch (granularity) {
                case "daily"  -> bucket.format(dayFmt);
                case "yearly" -> String.valueOf(bucket.getYear());
                default       -> bucket.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
                                 + " " + bucket.getYear();
            };
            long[] v = byBucket.getOrDefault(bucket, new long[]{0L, 0L});
            out.add(RevenueTrendPointResponse.builder()
                    .month(label).revenue(v[0]).count(v[1]).build());
        }
        return out;
    }

    /** Native aggregates arrive as BigInteger/BigDecimal/Long depending on the driver. */
    private static long toLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof BigInteger bi) return bi.longValue();
        if (o instanceof Number n) return n.longValue();
        return 0L;
    }

    /**
     * {@code date_trunc(... AT TIME ZONE ...)} returns a timestamp WITHOUT time
     * zone, which JDBC hands back as a {@link java.sql.Timestamp} already holding
     * the IST wall-clock bucket start -- so it is read directly rather than
     * re-zoned, which would shift it a second time.
     */
    private static LocalDate toLocalDate(Object o) {
        if (o == null) return null;
        if (o instanceof java.sql.Timestamp ts) return ts.toLocalDateTime().toLocalDate();
        if (o instanceof java.time.LocalDateTime ldt) return ldt.toLocalDate();
        if (o instanceof Instant i) return i.atZone(IST).toLocalDate();
        log.warn("Unexpected bucket type from collected-revenue query: {}", o.getClass());
        return null;
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
