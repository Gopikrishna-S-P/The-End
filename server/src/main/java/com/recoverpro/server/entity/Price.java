package com.recoverpro.server.entity;

import com.recoverpro.server.enums.BillingInterval;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Local, versioned pricing catalog. Not a replacement for the payment provider as the
 * source of truth for what a customer is actually charged -- exists so both Stripe and
 * Razorpay can resolve to the same plan/interval/currency concept during migration, and so
 * MRR/ARR reporting stops depending on which provider a given org happens to be on.
 * <p>
 * Never mutated once referenced by a live subscription: a price change inserts a new row
 * with a later {@code effectiveFrom} and flips the old row's {@code active} to false.
 */
@Entity
@Table(name = "prices", indexes = {
        @Index(name = "idx_prices_plan_active", columnList = "plan, active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Price {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan", nullable = false, length = 20)
    private OrgSubscription.Plan plan;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_interval", nullable = false, length = 10)
    private BillingInterval billingInterval;

    @Column(name = "interval_count", nullable = false)
    @Builder.Default
    private Integer intervalCount = 1;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "amount_minor_units", nullable = false)
    private Long amountMinorUnits;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private Instant effectiveFrom = Instant.now();

    @Column(name = "stripe_price_id", length = 100)
    private String stripePriceId;

    @Column(name = "razorpay_plan_id", length = 100)
    private String razorpayPlanId;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
