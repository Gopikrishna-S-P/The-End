package com.recoverpro.server.entity;

import com.recoverpro.server.enums.SettlementOfferStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Debt settlement offer: propose accepting less than the full outstanding balance to close a
 * case. See docs/superpowers/specs/2026-08-04-settlement-offers-design.md for the full workflow.
 * Schema (including FKs, RLS, check constraints, optimistic-lock version column) has existed
 * since V038/V040/V041/V043 -- only the application layer was ever missing.
 */
@Entity
@Table(name = "settlement_offers", indexes = {
        @Index(name = "idx_settlement_offers_allocation", columnList = "allocation_id"),
        @Index(name = "idx_settlement_offers_org",        columnList = "organization_id"),
        @Index(name = "idx_settlement_offers_status",     columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "borrower_id")
    private UUID borrowerId;

    @Column(name = "outstanding_at_offer", nullable = false, precision = 15, scale = 2)
    private BigDecimal outstandingAtOffer;

    @Column(name = "offered_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal offeredAmount;

    @Column(name = "discount_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPct;

    @Column(name = "tenor_days", nullable = false)
    private Integer tenorDays;

    @Column(name = "validity_until", nullable = false)
    private Instant validityUntil;

    @Column(name = "conditions", columnDefinition = "TEXT")
    private String conditions;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SettlementOfferStatus status = SettlementOfferStatus.DRAFT;

    @Column(name = "drafted_by_user_id", nullable = false)
    private UUID draftedByUserId;

    @Column(name = "proposed_by_user_id")
    private UUID proposedByUserId;

    @Column(name = "proposed_at")
    private Instant proposedAt;

    @Column(name = "approved_by_user_id")
    private UUID approvedByUserId;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejected_by_user_id")
    private UUID rejectedByUserId;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "compliance_review_required", nullable = false)
    @Builder.Default
    private Boolean complianceReviewRequired = false;

    @Column(name = "compliance_reviewed_by_user_id")
    private UUID complianceReviewedByUserId;

    @Column(name = "compliance_reviewed_at")
    private Instant complianceReviewedAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "borrower_consent_artifact_id")
    private UUID borrowerConsentArtifactId;

    @Column(name = "acceptance_otp_hash", length = 64)
    private String acceptanceOtpHash;

    @Column(name = "acceptance_otp_expires_at")
    private Instant acceptanceOtpExpiresAt;

    @Column(name = "acceptance_mode", length = 20)
    private String acceptanceMode;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "payment_intent_id")
    private UUID paymentIntentId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
