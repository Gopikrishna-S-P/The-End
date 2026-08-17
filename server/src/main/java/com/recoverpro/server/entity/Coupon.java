package com.recoverpro.server.entity;

import com.recoverpro.server.enums.DiscountType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Local record of what a coupon offers. The actual discount MUST be applied through the
 * payment provider's own coupon/promo-code mechanism at checkout time, so the amount
 * actually billed matches what this row promises -- never compute a discounted total
 * locally and hope it matches the provider's charge.
 */
@Entity
@Table(name = "coupons", uniqueConstraints = {
        @UniqueConstraint(name = "uq_coupons_code", columnNames = "code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    private DiscountType discountType;

    /** Basis points if PERCENTAGE (1000 = 10%), minor currency units if FIXED. */
    @Column(name = "discount_value", nullable = false)
    private Long discountValue;

    @Column(name = "max_redemptions")
    private Integer maxRedemptions;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "provider_coupon_id", length = 100)
    private String providerCouponId;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
