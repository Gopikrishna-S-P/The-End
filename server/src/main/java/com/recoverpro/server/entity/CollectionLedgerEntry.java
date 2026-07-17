package com.recoverpro.server.entity;

import com.recoverpro.server.enums.LedgerEntryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Double-entry bookkeeping journal for every monetary collection event.
 *
 * Every approved/deposited/reversed collection produces two rows -- one debit
 * and one credit -- so the ledger is always balanced. Insert-only; a DB
 * trigger (V013) blocks UPDATE/DELETE.
 *
 * Accounts: BORROWER_OUTSTANDING, COLLECTIONS_IN_TRANSIT, BANK_ACCOUNT.
 *   APPROVE: DR COLLECTIONS_IN_TRANSIT / CR BORROWER_OUTSTANDING
 *   DEPOSIT: DR BANK_ACCOUNT           / CR COLLECTIONS_IN_TRANSIT
 *   REVERSE: DR BORROWER_OUTSTANDING   / CR COLLECTIONS_IN_TRANSIT
 */
@Entity
@Table(name = "collection_ledger_entries", indexes = {
        @Index(name = "idx_ledger_org_created",  columnList = "organization_id, created_at"),
        @Index(name = "idx_ledger_collection",   columnList = "collection_id"),
        @Index(name = "idx_ledger_allocation",   columnList = "allocation_id"),
        @Index(name = "idx_ledger_debit_acct",   columnList = "debit_account"),
        @Index(name = "idx_ledger_credit_acct",  columnList = "credit_account")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "collection_id", nullable = false, updatable = false)
    private UUID collectionId;

    @Column(name = "allocation_id", nullable = false, updatable = false)
    private UUID allocationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 30, updatable = false)
    private LedgerEntryType entryType;

    /** Account being debited (increased). */
    @Column(name = "debit_account", nullable = false, length = 40, updatable = false)
    private String debitAccount;

    /** Account being credited (decreased). */
    @Column(name = "credit_account", nullable = false, length = 40, updatable = false)
    private String creditAccount;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    @Builder.Default
    private String currency = "INR";

    /** Receipt number, idempotency key, or collection ID -- human-readable reference. */
    @Column(name = "reference_id", length = 64, updatable = false)
    private String referenceId;

    /** User who triggered the state change that produced this entry. */
    @Column(name = "actor_id", updatable = false)
    private UUID actorId;

    @Column(name = "notes", columnDefinition = "TEXT", updatable = false)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
