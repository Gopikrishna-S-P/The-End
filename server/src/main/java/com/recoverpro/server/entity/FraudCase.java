package com.recoverpro.server.entity;

import com.recoverpro.server.enums.FraudCaseStatus;
import com.recoverpro.server.enums.FraudCategory;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "fraud_cases", indexes = {
        @Index(name = "idx_fraud_org",         columnList = "organization_id"),
        @Index(name = "idx_fraud_allocation",  columnList = "allocation_id"),
        @Index(name = "idx_fraud_status",      columnList = "status"),
        @Index(name = "idx_fraud_reported_at", columnList = "reported_at"),
        @Index(name = "idx_fraud_case_number", columnList = "case_number", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FraudCase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "case_number", length = 30, unique = true, updatable = false)
    private String caseNumber;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "allocation_id")
    private UUID allocationId;

    @Column(name = "borrower_id")
    private UUID borrowerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 40)
    private FraudCategory category;

    @Column(name = "amount_involved", precision = 15, scale = 2)
    private BigDecimal amountInvolved;

    @Column(name = "incident_date")
    private LocalDate incidentDate;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence_url", length = 1024)
    private String evidenceUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private FraudCaseStatus status = FraudCaseStatus.REPORTED;

    @Column(name = "investigated_by_user_id")
    private UUID investigatedByUserId;

    @Column(name = "investigation_notes", columnDefinition = "TEXT")
    private String investigationNotes;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "reported_by_user_id", nullable = false)
    private UUID reportedByUserId;

    @Column(name = "reported_at", nullable = false)
    private Instant reportedAt;

    @Column(name = "cfr_lookup_at")
    private Instant cfrLookupAt;

    @Column(name = "cfr_lookup_result", length = 500)
    private String cfrLookupResult;

    @Column(name = "frms_submitted_at")
    private Instant frmsSubmittedAt;

    @Column(name = "frms_acknowledgement", length = 200)
    private String frmsAcknowledgement;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); if (reportedAt == null) reportedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
