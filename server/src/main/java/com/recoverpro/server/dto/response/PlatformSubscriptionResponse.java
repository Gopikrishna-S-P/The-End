package com.recoverpro.server.dto.response;

import com.recoverpro.server.entity.OrgSubscription.Plan;
import com.recoverpro.server.entity.OrgSubscription.Status;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PlatformSubscriptionResponse {
    private UUID orgId;
    private String orgName;
    private String orgCode;
    private Status status;
    private Plan plan;
    private String stripeCustomerId;
    private String stripeSubscriptionId;
    private Instant trialEndsAt;
    private Instant currentPeriodEnd;
    private Boolean cancelAtPeriodEnd;
    private Instant createdAt;
    private int trialDaysLeft;

    /**
     * Paise this org has actually paid us, summed over settled invoices.
     *
     * <p>COLLECTED, not contracted -- an org on GROWTH whose last three charges
     * failed shows its real contribution here, which {@code plan} alone overstates.
     * Zero for orgs that have never paid, and for every org until
     * {@code POST /backfill-invoices} has imported history.
     */
    private long lifetimeRevenue;

    /* ── Admin-granted access ───────────────────────────────────────────────── */

    /** Plan granted without payment, or null. Kept separate from {@code plan} so a comp never reads as revenue. */
    private Plan    compedPlan;
    /** Null with a comp set means open-ended. */
    private Instant compedUntil;
    private String  compedReason;
    private Instant compedAt;

    /**
     * What the org is actually entitled to right now -- the live comp if there
     * is one, otherwise {@code plan}. This is what gates features; {@code plan}
     * alone is what they pay for, and the two differ whenever a comp is active.
     */
    private Plan effectivePlan;
}
