package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * SYSTEM-PLAN 10.1: previousHash/rowHash and computeHash() were removed (Option 1, per
 * docs/AUDIT-DESIGN.md) -- computeHash() had zero callers, so the columns were populated with
 * nothing. A schema that looks tamper-evident but isn't is worse than no hash chain at all: an
 * auditor reading previous_hash/row_hash columns would reasonably assume they mean something.
 * The REAL tamper-evidence control is trg_audit_immutable / prevent_audit_log_update()
 * (V016__audit_log_partitioning.sql, recreated by V028's table rebuild), a BEFORE UPDATE OR
 * DELETE trigger that unconditionally rejects both at the database level -- confirmed applied to
 * this exact table by {@code AuditLogImmutabilityTest}, not just claimed. V016's partitioning
 * rebuild replaced V006's original trigger on this one table, so V006's
 * fn_audit_log_immutable()/trg_user_action_audit_immutable is no longer what protects this
 * table (it still protects allocation_audit_logs and settlement_audit_logs via V084, unaffected).
 * Either way, a DB-level trigger is a stronger, simpler guarantee than an application-computed
 * chain nobody verified.
 */
@Entity
@Table(name = "user_action_audit_logs", indexes = {
        @Index(name = "idx_user_action_audit_user_id",    columnList = "user_id"),
        @Index(name = "idx_user_action_audit_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserActionAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
