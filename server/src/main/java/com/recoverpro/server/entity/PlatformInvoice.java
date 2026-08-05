package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Local mirror of a Stripe invoice for this platform's own SaaS billing --
 * money organizations pay us. Unrelated to loan-repayment collections; see
 * {@link PaymentTransaction} for money borrowers pay to organizations.
 *
 * <p>Stripe is the system of record. Rows are written only by
 * {@code StripeWebhookService} on {@code invoice.*} events and by the one-shot
 * backfill, so treat every field here as a cache of Stripe's value.
 *
 * <p>Amounts are in the smallest currency unit (paise for INR), matching Stripe.
 * Note this differs from {@link OrgSubscription#getPlanAmount()}, which is in
 * rupees.
 */
@Entity
@Table(name = "platform_invoices", indexes = {
        @Index(name = "idx_platform_invoices_org_issued", columnList = "org_id, issued_at"),
        @Index(name = "idx_platform_invoices_stripe_id", columnList = "stripe_invoice_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "stripe_invoice_id", nullable = false, unique = true, length = 64)
    private String stripeInvoiceId;

    @Column(name = "stripe_customer_id", length = 64)
    private String stripeCustomerId;

    /** Stripe's human-facing invoice number, e.g. {@code ABCD-0001}. Null while draft. */
    @Column(name = "number", length = 64)
    private String number;

    /** Stripe invoice status verbatim: draft, open, paid, void, uncollectible. */
    @Column(name = "status", nullable = false, length = 32)
    private String status;

    /** Paise. */
    @Column(name = "amount_due", nullable = false)
    @Builder.Default
    private Long amountDue = 0L;

    /** Paise. */
    @Column(name = "amount_paid", nullable = false)
    @Builder.Default
    private Long amountPaid = 0L;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "inr";

    @Column(name = "period_start")
    private Instant periodStart;

    @Column(name = "period_end")
    private Instant periodEnd;

    @Column(name = "issued_at")
    private Instant issuedAt;

    /** When Stripe settled it; null unless {@code status == "paid"}. Drives all revenue sums. */
    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "hosted_invoice_url", columnDefinition = "TEXT")
    private String hostedInvoiceUrl;

    @Column(name = "invoice_pdf_url", columnDefinition = "TEXT")
    private String invoicePdfUrl;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
