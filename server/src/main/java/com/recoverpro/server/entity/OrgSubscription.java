package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "org_subscriptions", indexes = {
        @Index(name = "idx_sub_org_id", columnList = "org_id", unique = true),
        @Index(name = "idx_sub_stripe_customer", columnList = "stripe_customer_id"),
        @Index(name = "idx_sub_stripe_sub", columnList = "stripe_subscription_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrgSubscription {

    public enum Status {
        TRIAL, ACTIVE, PAST_DUE, CANCELLED, INACTIVE
    }

    public enum Plan {
        NONE, STARTER, GROWTH, ENTERPRISE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "org_id", nullable = false, unique = true)
    private UUID orgId;

    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.TRIAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Plan plan = Plan.NONE;

    /** Monthly amount (INR) synced from the Stripe Price object -- the single source of
     * truth for MRR/ARR, kept in step with real billing instead of a hardcoded map. */
    @Column(name = "plan_amount", precision = 12, scale = 2)
    private BigDecimal planAmount;

    @Column(name = "trial_ends_at")
    private Instant trialEndsAt;

    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;

    @Column(name = "cancel_at_period_end")
    @Builder.Default
    private Boolean cancelAtPeriodEnd = false;

    /* ── Admin-granted access ────────────────────────────────────────────────
     * Written only by the platform-admin comp endpoints. StripeWebhookService
     * must never touch these: they exist precisely so a grant survives the
     * webhook overwriting plan/status/current_period_end from Stripe. */

    @Enumerated(EnumType.STRING)
    @Column(name = "comped_plan", length = 20)
    private Plan compedPlan;

    /** Null with a comp set means open-ended. */
    @Column(name = "comped_until")
    private Instant compedUntil;

    @Column(name = "comped_reason", columnDefinition = "TEXT")
    private String compedReason;

    @Column(name = "comped_by")
    private UUID compedBy;

    @Column(name = "comped_at")
    private Instant compedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    /**
     * The comped plan if a grant is currently live, otherwise null.
     *
     * <p>Expiry is evaluated on read, so a lapsed comp stops applying the moment
     * it passes {@code compedUntil} without needing a sweep job to clear it.
     * That also means the row keeps its history -- who granted what, when and
     * why -- after the grant stops taking effect.
     */
    public Plan activeComp() {
        if (compedPlan == null) return null;
        if (compedUntil != null && !Instant.now().isBefore(compedUntil)) return null;
        return compedPlan;
    }

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
