package com.recoverpro.server.entity;

import com.recoverpro.server.enums.RestructureStatus;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * EMI restructure / re-aging proposal. Always lender-approved (Bank Admin).
 * On borrower acceptance the linking cascade (close old Allocation as
 * RESTRUCTURED, create new Allocation with restructured_from_id) is NOT
 * implemented here -- it requires a broader AllocationService refactor and
 * is tracked as a separate follow-up. ACCEPTED is the practical terminal
 * state this service reaches; ACTIVE has no transition into it yet.
 */
@Entity
@Table(name = "restructure_proposals", indexes = {
        @Index(name = "idx_restructure_allocation", columnList = "allocation_id"),
        @Index(name = "idx_restructure_org",        columnList = "organization_id"),
        @Index(name = "idx_restructure_status",     columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestructureProposal {

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

    // ---- Original loan terms (snapshot) ----
    @Column(name = "original_emi_count", nullable = false)
    private Integer originalEmiCount;

    @Column(name = "original_emi_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal originalEmiAmount;

    @Column(name = "original_apr", nullable = false, precision = 5, scale = 2)
    private BigDecimal originalApr;

    // ---- Proposed new terms ----
    @Column(name = "new_emi_count", nullable = false)
    private Integer newEmiCount;

    @Column(name = "new_emi_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal newEmiAmount;

    @Column(name = "new_apr", nullable = false, precision = 5, scale = 2)
    private BigDecimal newApr;

    /** Optional step-up/step-down schedule as JSON. */
    @Type(JsonType.class)
    @Column(name = "step_schedule", columnDefinition = "jsonb")
    private List<Map<String, Object>> stepSchedule;

    @Column(name = "rationale", columnDefinition = "TEXT")
    private String rationale;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private RestructureStatus status = RestructureStatus.DRAFT;

    @Column(name = "drafted_by_user_id", nullable = false)
    private UUID draftedByUserId;

    @Column(name = "proposed_to_lender_at")
    private Instant proposedToLenderAt;

    @Column(name = "lender_approval_user_id")
    private UUID lenderApprovalUserId;

    @Column(name = "lender_approval_at")
    private Instant lenderApprovalAt;

    @Column(name = "borrower_accepted_at")
    private Instant borrowerAcceptedAt;

    @Column(name = "borrower_consent_artifact_id")
    private UUID borrowerConsentArtifactId;

    /** New allocation that supersedes the old one once ACTIVE (not yet reachable). */
    @Column(name = "new_allocation_id")
    private UUID newAllocationId;

    @Column(name = "rejected_by_user_id")
    private UUID rejectedByUserId;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
