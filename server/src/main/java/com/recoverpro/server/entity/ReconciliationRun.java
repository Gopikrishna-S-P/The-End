package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One reconciliation pass -- typically a sponsor-bank MIS / VAN-credit /
 * PG-settlement file or an inline batch (design-doc §5.5).
 */
@Entity
@Table(name = "reconciliation_runs", indexes = {
        @Index(name = "idx_recon_run_org",    columnList = "organization_id"),
        @Index(name = "idx_recon_run_as_of",  columnList = "as_of_date"),
        @Index(name = "idx_recon_run_source", columnList = "source")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    /** Free-form source label, e.g., "sponsor:HDFC", "pg:razorpay", "manual". */
    @Column(name = "source", nullable = false, length = 50)
    private String source;

    @Column(name = "as_of_date", nullable = false)
    private LocalDate asOfDate;

    @Column(name = "rows_ingested", nullable = false)
    @Builder.Default
    private int rowsIngested = 0;

    @Column(name = "matched", nullable = false)
    @Builder.Default
    private int matched = 0;

    @Column(name = "unmatched", nullable = false)
    @Builder.Default
    private int unmatched = 0;

    @Column(name = "amount_diff", nullable = false)
    @Builder.Default
    private int amountDiff = 0;

    @Column(name = "duplicates", nullable = false)
    @Builder.Default
    private int duplicates = 0;

    @Column(name = "exceptions", nullable = false)
    @Builder.Default
    private int exceptions = 0;

    /**
     * SHA-256 of the statement file content. Used for idempotency: re-ingesting
     * the same file returns the existing run rather than duplicating data.
     */
    @Column(name = "statement_hash", length = 64, unique = true)
    private String statementHash;

    /** Optional handoff to ReportJob for end-of-day exception export. */
    @Column(name = "report_job_id")
    private UUID reportJobId;

    @Column(name = "started_by_user_id")
    private UUID startedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
