package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Breakdown row for a {@link PlatformInvoice}, populated from the provider's own invoice
 * line data at webhook-mirror time. Additive detail only -- PlatformInvoice remains the
 * flat-total mirror and system of record; this exists for GST reporting and any future
 * proration line items.
 */
@Entity
@Table(name = "invoice_line_items", indexes = {
        @Index(name = "idx_invoice_line_items_invoice", columnList = "invoice_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "invoice_id", nullable = false)
    private UUID invoiceId;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "quantity", nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "unit_amount", nullable = false)
    private Long unitAmount;

    /** Basis points, e.g. 1800 = 18% GST. Null when not tax-applicable. */
    @Column(name = "tax_rate_bps")
    private Integer taxRateBps;

    @Column(name = "line_total", nullable = false)
    private Long lineTotal;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
