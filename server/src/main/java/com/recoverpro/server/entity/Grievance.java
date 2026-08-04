package com.recoverpro.server.entity;

import com.recoverpro.server.enums.GrievanceCategory;
import com.recoverpro.server.enums.GrievanceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Borrower grievance (design spec: docs/superpowers/specs/2026-08-04-grievances-design.md).
 * Modeled after {@link FraudCase} -- a "case" entity with a generated reference number and a
 * simple linear status switch, not an approve/reject workflow -- so unlike SettlementOffer/
 * RestructureProposal there is no separate per-transition audit-log table.
 */
@Entity
@Table(name = "grievances", indexes = {
        @Index(name = "idx_grievances_org",        columnList = "organization_id"),
        @Index(name = "idx_grievances_allocation",  columnList = "allocation_id"),
        @Index(name = "idx_grievances_status",      columnList = "status"),
        @Index(name = "idx_grievances_ticket",      columnList = "ticket_number", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Grievance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "ticket_number", length = 30, unique = true, updatable = false)
    private String ticketNumber;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "allocation_id")
    private UUID allocationId;

    @Column(name = "raised_by_user_id")
    private UUID raisedByUserId;

    @Column(name = "borrower_name", length = 200)
    private String borrowerName;

    @Column(name = "borrower_email", length = 255)
    private String borrowerEmail;

    @Column(name = "borrower_phone", length = 30)
    private String borrowerPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 32)
    private GrievanceCategory category;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence_url", length = 1024)
    private String evidenceUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private GrievanceStatus status = GrievanceStatus.RECEIVED;

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "acknowledgement_due_at", nullable = false)
    private Instant acknowledgementDueAt;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "resolution_due_at", nullable = false)
    private Instant resolutionDueAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
