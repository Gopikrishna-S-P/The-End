package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only compliance audit log for PTP state transitions -- same shape
 * as {@link CollectionAuditLog}, DB-enforced immutable (V006 trigger).
 * Distinct from {@link PtpHistory}, which is the richer PTP-specific
 * business history (collected-amount snapshots, display names) surfaced
 * to end users; this table exists for the standardized audit trail.
 */
@Entity
@Table(name = "ptp_audit_logs", indexes = {
        @Index(name = "idx_ptp_audit_ptp_id",        columnList = "ptp_id"),
        @Index(name = "idx_ptp_audit_allocation_id", columnList = "allocation_id"),
        @Index(name = "idx_ptp_audit_performed_by",  columnList = "performed_by")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PtpAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "ptp_id", nullable = false)
    private UUID ptpId;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    @Column(name = "previous_status", length = 30)
    private String previousStatus;

    @Column(name = "new_status", length = 30)
    private String newStatus;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
