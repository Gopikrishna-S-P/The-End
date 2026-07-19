package com.recoverpro.server.service;

import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.response.PlatformAnalyticsResponse;
import com.recoverpro.server.dto.response.PlatformAnalyticsResponse.NameValue;
import com.recoverpro.server.dto.response.PlatformAnalyticsResponse.PlanCounts;
import com.recoverpro.server.dto.response.PlatformAnalyticsResponse.StatusCounts;
import com.recoverpro.server.dto.response.TrendPoint;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.OrgSubscription.Plan;
import com.recoverpro.server.entity.OrgSubscription.Status;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds real platform-admin analytics from org_subscriptions, organizations,
 * and users. Plan pricing is the single server-side source of truth for MRR.
 */
@Service
@RequiredArgsConstructor
public class PlatformAnalyticsService {

    private final OrgSubscriptionRepository subRepo;
    private final OrganizationRepository    orgRepo;
    private final UserRepository            userRepo;

    /** Monthly list price per plan (INR). Source of truth for MRR/ARR -- also used by
     * PlatformSubscriptionController's revenue-trend endpoint (BCR-5), so kept public/static
     * rather than duplicated. */
    private static final Map<Plan, Long> PLAN_PRICE = new EnumMap<>(Plan.class);
    static {
        PLAN_PRICE.put(Plan.NONE,        0L);
        PLAN_PRICE.put(Plan.STARTER,  2999L);
        PLAN_PRICE.put(Plan.GROWTH,   7999L);
        PLAN_PRICE.put(Plan.ENTERPRISE, 19999L);
    }

    private static long priceOf(Plan plan) {
        return plan == null ? 0L : PLAN_PRICE.getOrDefault(plan, 0L);
    }

    /** Real Stripe-synced amount when available; falls back to the default list price for
     * subscriptions that predate {@code plan_amount} (not yet re-synced by a Stripe webhook). */
    public static long amountOf(OrgSubscription s) {
        return s.getPlanAmount() != null
                ? s.getPlanAmount().setScale(0, java.math.RoundingMode.HALF_UP).longValue()
                : priceOf(s.getPlan());
    }

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    @Transactional(readOnly = true)
    public PlatformAnalyticsResponse build(int months) {
        int span = Math.max(1, Math.min(months, 24));
        Instant now = Instant.now();
        Instant in7Days = now.plusSeconds(7L * 24 * 3600);

        List<OrgSubscription> subs = subRepo.findAll();

        // ── Plan & status counts ────────────────────────────────────────────
        PlanCounts.PlanCountsBuilder pc = PlanCounts.builder();
        StatusCounts.StatusCountsBuilder sc = StatusCounts.builder();
        long none = 0, starter = 0, growth = 0, enterprise = 0;
        long trial = 0, active = 0, pastDue = 0, cancelled = 0, inactive = 0;
        long mrr = 0;
        long trialsEndingSoon = 0;

        for (OrgSubscription s : subs) {
            switch (s.getPlan() == null ? Plan.NONE : s.getPlan()) {
                case STARTER    -> starter++;
                case GROWTH     -> growth++;
                case ENTERPRISE -> enterprise++;
                default         -> none++;
            }
            Status st = s.getStatus() == null ? Status.INACTIVE : s.getStatus();
            switch (st) {
                case TRIAL     -> trial++;
                case ACTIVE    -> active++;
                case PAST_DUE  -> pastDue++;
                case CANCELLED -> cancelled++;
                default        -> inactive++;
            }
            if (st == Status.ACTIVE) mrr += amountOf(s);
            if (st == Status.TRIAL && s.getTrialEndsAt() != null
                    && !s.getTrialEndsAt().isBefore(now) && s.getTrialEndsAt().isBefore(in7Days)) {
                trialsEndingSoon++;
            }
        }

        // ── Revenue trend: cumulative active MRR by month ────────────────────
        List<YearMonth> axis = lastMonths(span);
        List<TrendPoint> revenueTrend = new ArrayList<>(axis.size());
        for (YearMonth ym : axis) {
            Instant monthEnd = ym.atEndOfMonth().atTime(23, 59, 59).atZone(IST).toInstant();
            long monthMrr = 0;
            long activeAtMonth = 0;
            for (OrgSubscription s : subs) {
                if (s.getStatus() == Status.ACTIVE
                        && s.getCreatedAt() != null
                        && !s.getCreatedAt().isAfter(monthEnd)) {
                    monthMrr += amountOf(s);
                    activeAtMonth++;
                }
            }
            revenueTrend.add(point(ym, BigDecimal.valueOf(monthMrr), activeAtMonth));
        }
        double mrrGrowthRate = growthRate(revenueTrend);

        // ── Org growth: new orgs/month + cumulative ──────────────────────────
        List<Organization> tenantOrgs = orgRepo.findTenantOrgs();
        List<TrendPoint> orgGrowthTrend = new ArrayList<>(axis.size());
        for (YearMonth ym : axis) {
            Instant monthStart = ym.atDay(1).atStartOfDay(IST).toInstant();
            Instant monthEnd   = ym.atEndOfMonth().atTime(23, 59, 59).atZone(IST).toInstant();
            long newCount = 0, cumulative = 0;
            for (Organization o : tenantOrgs) {
                Instant c = o.getCreatedAt();
                if (c == null) continue;
                if (!c.isAfter(monthEnd)) cumulative++;
                if (!c.isBefore(monthStart) && !c.isAfter(monthEnd)) newCount++;
            }
            orgGrowthTrend.add(point(ym, BigDecimal.valueOf(cumulative), newCount));
        }

        // ── Top orgs by user headcount ───────────────────────────────────────
        List<NameValue> topOrgsByUsers = tenantOrgs.stream()
                .map(o -> NameValue.builder()
                        .name(o.getName())
                        .value(userRepo.countByOrganizationId(o.getId()))
                        .build())
                .filter(nv -> nv.getValue() > 0)
                .sorted(Comparator.comparingLong(NameValue::getValue).reversed())
                .limit(6)
                .toList();

        // ── User growth: new users/month (excl. platform admins) + cumulative ─
        Instant from = axis.get(0).atDay(1).atStartOfDay(IST).toInstant();
        Map<String, Long> userByMonth = new HashMap<>();
        for (Object[] row : userRepo.findMonthlyUserGrowth(from, PlatformConstants.ROLE_PLATFORM_ADMIN)) {
            userByMonth.put((String) row[0], ((Number) row[1]).longValue());
        }
        List<TrendPoint> userGrowthTrend = new ArrayList<>(axis.size());
        long userCumulative = 0;
        for (YearMonth ym : axis) {
            long n = userByMonth.getOrDefault(keyOf(ym), 0L);
            userCumulative += n;
            userGrowthTrend.add(point(ym, BigDecimal.valueOf(userCumulative), n));
        }

        return PlatformAnalyticsResponse.builder()
                .mrr(mrr)
                .arr(mrr * 12)
                .mrrGrowthRate(mrrGrowthRate)
                .payingOrgs(active)
                .trialOrgs(trial)
                .trialsEndingSoon(trialsEndingSoon)
                .planCounts(pc.none(none).starter(starter).growth(growth).enterprise(enterprise).build())
                .statusCounts(sc.trial(trial).active(active).pastDue(pastDue).cancelled(cancelled).inactive(inactive).build())
                .revenueTrend(revenueTrend)
                .orgGrowthTrend(orgGrowthTrend)
                .topOrgsByUsers(topOrgsByUsers)
                .userGrowthTrend(userGrowthTrend)
                .build();
    }

    /* ── Helpers ─────────────────────────────────────────────────────────── */

    private static List<YearMonth> lastMonths(int span) {
        YearMonth current = YearMonth.now();
        List<YearMonth> list = new ArrayList<>(span);
        for (int i = span - 1; i >= 0; i--) list.add(current.minusMonths(i));
        return list;
    }

    private static String keyOf(YearMonth ym) {
        return String.format("%04d-%02d", ym.getYear(), ym.getMonthValue());
    }

    private static TrendPoint point(YearMonth ym, BigDecimal amount, long count) {
        String label = ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + ym.getYear();
        return TrendPoint.builder()
                .year(ym.getYear())
                .month(ym.getMonthValue())
                .label(label)
                .totalAmount(amount)
                .totalCount(count)
                .build();
    }

    private static double growthRate(List<TrendPoint> series) {
        if (series.size() < 2) return 0d;
        long cur = series.get(series.size() - 1).getTotalAmount().longValue();
        long prev = series.get(series.size() - 2).getTotalAmount().longValue();
        if (prev == 0) return cur > 0 ? 100d : 0d;
        return ((double) (cur - prev) / prev) * 100d;
    }
}
