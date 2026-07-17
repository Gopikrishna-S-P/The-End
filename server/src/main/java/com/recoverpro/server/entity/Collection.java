package com.recoverpro.server.entity;

import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "collections", indexes = {
        @Index(name = "idx_collection_agent_date", columnList = "submitted_by, collection_date"),
        @Index(name = "idx_collection_status", columnList = "status"),
        @Index(name = "idx_collection_allocation", columnList = "allocation_id"),
        @Index(name = "idx_collection_idempotency", columnList = "idempotency_key", unique = true),
        @Index(name = "idx_collection_receipt", columnList = "receipt_number", unique = true),
        @Index(name = "idx_collection_org", columnList = "organization_id"),
        @Index(name = "idx_collection_org_loan_date", columnList = "organization_id, loan_number, collection_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Collection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "loan_number", nullable = false, length = 100)
    private String loanNumber;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "deposited_by")
    private UUID depositedBy;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode", nullable = false, length = 10)
    private PaymentMode paymentMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private CollectionStatus status = CollectionStatus.PENDING_APPROVAL;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "receipt_number", unique = true, length = 30)
    private String receiptNumber;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 64)
    private String idempotencyKey;

    @Column(name = "collection_date", nullable = false)
    private LocalDate collectionDate;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "deposited_at")
    private Instant depositedAt;

    @Column(name = "cheque_number", length = 30)
    private String chequeNumber;

    @Column(name = "cheque_date")
    private LocalDate chequeDate;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "upi_reference_id", length = 50)
    private String upiReferenceId;

    @Column(name = "transaction_reference_id", length = 50)
    private String transactionReferenceId;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "cash_handling_acknowledged", nullable = false)
    @Builder.Default
    private Boolean cashHandlingAcknowledged = false;

    @Column(name = "cash_supervisor_signed_by")
    private UUID cashSupervisorSignedBy;

    @Column(name = "cash_supervisor_signed_at")
    private Instant cashSupervisorSignedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
