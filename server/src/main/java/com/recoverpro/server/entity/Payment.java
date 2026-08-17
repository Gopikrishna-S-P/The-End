package com.recoverpro.server.entity;

import com.recoverpro.server.enums.PaymentProviderType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Local mirror of a single payment attempt at the provider (Stripe PaymentIntent / Razorpay
 * Payment). Unlike {@link Refund} or {@link com.recoverpro.server.entity.Credit}, this is NOT
 * append-only: the same provider payment id legitimately arrives across multiple webhook
 * deliveries as its status progresses (created -&gt; captured, or created -&gt; failed), so rows
 * are upserted keyed on (provider, providerPaymentId) rather than written once.
 * <p>
 * Never stores card/instrument details -- paymentMethodType is a coarse category
 * ("card"/"upi"/"netbanking") taken directly from the provider's own payment object, never a
 * card number, last4, or other PAN-adjacent value.
 */
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payments_org", columnList = "organization_id, created_at"),
        @Index(name = "idx_payments_invoice", columnList = "invoice_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    /** Nullable: a payment can be captured before/without an invoice being generated yet. */
    @Column(name = "invoice_id")
    private UUID invoiceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private PaymentProviderType provider;

    @Column(name = "provider_payment_id", nullable = false, length = 100)
    private String providerPaymentId;

    @Column(name = "amount_minor_units", nullable = false)
    private Long amountMinorUnits;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    /** Raw provider status string, mirrored as-is (e.g. Stripe "succeeded", Razorpay "captured"),
     *  not normalized into a shared enum -- the two providers' status vocabularies don't map
     *  cleanly onto each other and callers that care about "did this succeed" should check
     *  capturedAt/failedAt instead of string-matching this field. */
    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "payment_method_type", length = 30)
    private String paymentMethodType;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "captured_at")
    private Instant capturedAt;

    @Column(name = "failed_at")
    private Instant failedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
