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

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
