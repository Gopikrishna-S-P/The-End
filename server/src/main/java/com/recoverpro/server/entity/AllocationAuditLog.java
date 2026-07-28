package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "allocation_audit_logs", indexes = {
        @Index(name = "idx_alloc_audit_allocation_id", columnList = "allocation_id"),
        @Index(name = "idx_alloc_audit_performed_by",  columnList = "performed_by")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllocationAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    /** STATUS_CHANGED (manual Close/Reopen via the status dropdown) or
     *  DISPOSITION_CHANGED (automatic, set from a field officer's visit outcome). */
    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    @Column(name = "previous_value", length = 50)
    private String previousValue;

    @Column(name = "new_value", length = 50)
    private String newValue;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
