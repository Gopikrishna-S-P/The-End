package com.recoverpro.server.entity;

import com.recoverpro.server.enums.KfsGenerationReason;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * Key Fact Statement: a generate-once, immutable disclosure of a restructuring's revised loan
 * terms (see docs/superpowers/specs/2026-08-04-kfs-design.md). Exactly one per
 * RestructureProposal, enforced by a unique index on restructure_proposal_id -- there is no
 * approve/reject workflow here, the underlying proposal already went through that.
 */
@Entity
@Table(name = "key_fact_statements", indexes = {
        @Index(name = "idx_kfs_allocation",    columnList = "allocation_id"),
        @Index(name = "idx_kfs_organization",  columnList = "organization_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KeyFactStatement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "restructure_proposal_id", nullable = false)
    private UUID restructureProposalId;

    @Column(name = "version_label", length = 50)
    private String versionLabel;

    @Column(name = "is_current", nullable = false)
    @Builder.Default
    private Boolean isCurrent = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_reason", nullable = false, length = 50)
    private KfsGenerationReason generationReason;

    @Column(name = "sanctioned_amount", precision = 15, scale = 2)
    private BigDecimal sanctionedAmount;

    @Column(name = "net_disbursed_amount", precision = 15, scale = 2)
    private BigDecimal netDisbursedAmount;

    @Column(name = "total_interest_charge", precision = 15, scale = 2)
    private BigDecimal totalInterestCharge;

    @Column(name = "processing_fee", precision = 15, scale = 2)
    private BigDecimal processingFee;

    @Column(name = "other_charges", precision = 15, scale = 2)
    private BigDecimal otherCharges;

    @Column(name = "total_payable", precision = 15, scale = 2)
    private BigDecimal totalPayable;

    @Column(name = "apr_percent", precision = 8, scale = 4)
    private BigDecimal aprPercent;

    @Column(name = "interest_rate_percent", precision = 8, scale = 4)
    private BigDecimal interestRatePercent;

    @Column(name = "interest_type", length = 50)
    private String interestType;

    @Column(name = "tenure_months")
    private Integer tenureMonths;

    @Column(name = "emi_amount", precision = 15, scale = 2)
    private BigDecimal emiAmount;

    @Column(name = "repayment_frequency", length = 50)
    private String repaymentFrequency;

    @Column(name = "penal_charges_description", columnDefinition = "TEXT")
    private String penalChargesDescription;

    @Column(name = "cooling_off_days")
    private Integer coolingOffDays;

    @Column(name = "first_emi_date")
    private LocalDate firstEmiDate;

    @Column(name = "last_emi_date")
    private LocalDate lastEmiDate;

    @Type(JsonType.class)
    @Column(name = "additional_facts", columnDefinition = "jsonb")
    private Map<String, Object> additionalFacts;

    @Column(name = "rendered_html", columnDefinition = "TEXT")
    private String renderedHtml;

    @Column(name = "content_sha256", length = 64)
    private String contentSha256;

    @Column(name = "pdf_path", length = 500)
    private String pdfPath;

    @Column(name = "pdf_sha256", length = 64)
    private String pdfSha256;

    @Column(name = "generated_by_user_id")
    private UUID generatedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
