package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A local, traceable record of a credit issued through the payment provider's own
 * balance/credit-note mechanism -- not a rebuilt ledger. This table's only job is
 * traceability (who, why, how much, when); the provider remains authoritative for what
 * a customer's actual account balance is. Immutable once written (trg_credits_immutable,
 * V086), same posture as refunds.
 */
@Entity
@Table(name = "credits", indexes = {
        @Index(name = "idx_credits_org", columnList = "organization_id, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Credit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "amount_minor_units", nullable = false)
    private Long amountMinorUnits;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "issued_by_user_id", nullable = false)
    private UUID issuedByUserId;

    @Column(name = "provider_credit_ref", length = 100)
    private String providerCreditRef;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
