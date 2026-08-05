package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Platform-admin analytics — subscription/revenue, organization growth, and
 * user growth, all derived from real data (org_subscriptions, organizations,
 * users). Consumed by the platform dashboard.
 */
@Data
@Builder
public class PlatformAnalyticsResponse {

    /* ── Subscriptions / revenue ─────────────────────────────────────────── */
    private long   mrr;            // monthly recurring revenue, INR (active subs)
    private long   arr;            // mrr * 12
    private double mrrGrowthRate;  // % change vs previous month
    private long   payingOrgs;     // subscriptions with status = ACTIVE
    private long   trialOrgs;      // subscriptions with status = TRIAL
    private long   trialsEndingSoon; // active trials ending within 7 days

    private PlanCounts   planCounts;
    private StatusCounts statusCounts;

    private List<TrendPoint> revenueTrend;     // cumulative active MRR by month (totalAmount = MRR)

    /* ── Organizations ───────────────────────────────────────────────────── */
    private List<TrendPoint> orgGrowthTrend;   // new orgs/month (totalCount), cumulative (totalAmount)
    private List<NameValue>  topOrgsByUsers;   // top tenant orgs by user headcount

    /* ── Users ───────────────────────────────────────────────────────────── */
    private List<TrendPoint> userGrowthTrend;  // new users/month (totalCount), cumulative (totalAmount)

    @Data
    @Builder
    public static class PlanCounts {
        private long none;
        private long starter;
        private long growth;
        private long enterprise;
    }

    @Data
    @Builder
    public static class StatusCounts {
        private long trial;
        private long active;
        private long pastDue;
        private long cancelled;
        private long inactive;
    }

    @Data
    @Builder
    public static class NameValue {
        private String name;
        private long   value;
    }
}
