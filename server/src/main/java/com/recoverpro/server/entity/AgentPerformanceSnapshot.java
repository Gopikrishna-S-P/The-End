package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "agent_performance_snapshots", indexes = {
        @Index(name = "idx_aps_agent_date", columnList = "agent_id, snapshot_date", unique = true),
        @Index(name = "idx_aps_org_date",   columnList = "organization_id, snapshot_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentPerformanceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "total_assigned", nullable = false) @Builder.Default
    private Integer totalAssigned = 0;

    @Column(name = "total_visited", nullable = false) @Builder.Default
    private Integer totalVisited = 0;

    @Column(name = "total_collected", nullable = false) @Builder.Default
    private Integer totalCollected = 0;

    @Column(name = "total_pending", nullable = false) @Builder.Default
    private Integer totalPending = 0;

    @Column(name = "total_reassigned_out", nullable = false) @Builder.Default
    private Integer totalReassignedOut = 0;

    @Column(name = "total_reassigned_in", nullable = false) @Builder.Default
    private Integer totalReassignedIn = 0;

    @Column(name = "amount_collected", nullable = false, precision = 18, scale = 2) @Builder.Default
    private BigDecimal amountCollected = BigDecimal.ZERO;

    @Column(name = "amount_outstanding", nullable = false, precision = 18, scale = 2) @Builder.Default
    private BigDecimal amountOutstanding = BigDecimal.ZERO;

    @Column(name = "visit_completion_rate", precision = 5, scale = 2)
    private BigDecimal visitCompletionRate;

    @Column(name = "collection_efficiency", precision = 5, scale = 2)
    private BigDecimal collectionEfficiency;

    @Column(name = "efficiency_score", precision = 5, scale = 2)
    private BigDecimal efficiencyScore;

    @Column(name = "rank_in_org")
    private Integer rankInOrg;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
