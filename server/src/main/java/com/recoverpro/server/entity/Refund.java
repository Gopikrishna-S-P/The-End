package com.recoverpro.server.entity;

import com.recoverpro.server.enums.RefundStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * References the original {@link PlatformInvoice} it refunds. Immutable once written
 * (trg_refunds_immutable, V086) -- a correction is a new row, never an edit of history.
 * Amount must be validated against the invoice's remaining refundable balance at the
 * application layer before this row is created; the DB only guarantees amount &gt; 0.
 */
@Entity
@Table(name = "refunds", indexes = {
        @Index(name = "idx_refunds_invoice", columnList = "invoice_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "invoice_id", nullable = false)
    private UUID invoiceId;

    @Column(name = "amount_minor_units", nullable = false)
    private Long amountMinorUnits;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "initiated_by_user_id", nullable = false)
    private UUID initiatedByUserId;

    @Column(name = "provider_refund_id", length = 100)
    private String providerRefundId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
