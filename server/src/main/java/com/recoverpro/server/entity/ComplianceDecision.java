package com.recoverpro.server.entity;

import com.recoverpro.server.enums.GuardType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "compliance_decisions", indexes = {
        @Index(name = "idx_cd_alloc",    columnList = "allocation_id"),
        @Index(name = "idx_cd_org_date", columnList = "org_id, decided_at")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "guard_type", length = 30, nullable = false)
    private GuardType guardType;

    @Column(name = "allocation_id")
    private UUID allocationId;

    @Column(name = "org_id")
    private UUID orgId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "action", length = 100)
    private String action;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "decided_at", nullable = false, updatable = false)
    private Instant decidedAt;

    @PrePersist
    void onCreate() { if (decidedAt == null) decidedAt = Instant.now(); }
}
