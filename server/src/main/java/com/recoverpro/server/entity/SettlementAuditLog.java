package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "settlement_audit_logs", indexes = {
        @Index(name = "idx_settlement_audit_offer_id",  columnList = "settlement_offer_id"),
        @Index(name = "idx_settlement_audit_allocation", columnList = "allocation_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "settlement_offer_id", nullable = false)
    private UUID settlementOfferId;

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

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
