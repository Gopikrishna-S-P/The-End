package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "monthly_loan_book_snapshots", indexes = {
        @Index(name = "idx_snapshot_org_month", columnList = "organization_id, snapshot_month", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyLoanBookSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "snapshot_month", nullable = false)
    private LocalDate snapshotMonth;

    @Column(name = "total_loans", nullable = false)
    private Integer totalLoans;

    @Column(name = "total_outstanding_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalOutstandingAmount;

    @Column(name = "total_collected_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalCollectedAmount;

    @Column(name = "total_npa_count", nullable = false)
    private Integer totalNpaCount;

    @Column(name = "total_npa_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalNpaAmount;

    @Column(name = "total_assigned_loans", nullable = false)
    private Integer totalAssignedLoans;

    @Column(name = "total_unassigned_loans", nullable = false)
    private Integer totalUnassignedLoans;

    @Column(name = "collection_efficiency_pct", precision = 5, scale = 2)
    private BigDecimal collectionEfficiencyPct;

    @Column(name = "recovery_rate_pct", precision = 5, scale = 2)
    private BigDecimal recoveryRatePct;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
