package com.recoverpro.server.entity;

import com.recoverpro.server.enums.ReconciliationOutcome;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One credit-side row from a bank/PG settlement file (design-doc §5.5).
 *
 * Match keys, in priority:
 *   1. utr (NPCI Unique Transaction Reference)
 *   2. txn_ref (caller-supplied reference, e.g., "RP{intentId-prefix}")
 *   3. (amount + value_date) -- last-resort match for ambiguous rows
 */
@Entity
@Table(name = "bank_statement_rows", indexes = {
        @Index(name = "idx_bsr_run",        columnList = "run_id"),
        @Index(name = "idx_bsr_outcome",    columnList = "outcome"),
        @Index(name = "idx_bsr_utr",        columnList = "utr"),
        @Index(name = "idx_bsr_txn_ref",    columnList = "txn_ref"),
        @Index(name = "idx_bsr_value_date", columnList = "value_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankStatementRow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "run_id", nullable = false)
    private UUID runId;

    @Column(name = "utr", length = 50)
    private String utr;

    @Column(name = "txn_ref", length = 100)
    private String txnRef;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "value_date", nullable = false)
    private LocalDate valueDate;

    @Column(name = "narration", length = 500)
    private String narration;

    /** Raw provider/bank record id, kept for forensic. */
    @Column(name = "source_row_id", length = 200)
    private String sourceRowId;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20)
    @Builder.Default
    private ReconciliationOutcome outcome = ReconciliationOutcome.UNMATCHED;

    /** Set when outcome is MATCHED or AMOUNT_DIFF -- points to the candidate txn. */
    @Column(name = "matched_payment_txn_id")
    private UUID matchedPaymentTxnId;

    @Column(name = "match_notes", length = 500)
    private String matchNotes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
