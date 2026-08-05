package com.recoverpro.server.entity;

import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.security.encryption.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ptp_records", indexes = {
        @Index(name = "idx_ptp_allocation_id", columnList = "allocation_id"),
        @Index(name = "idx_ptp_status", columnList = "status"),
        @Index(name = "idx_ptp_promised_date", columnList = "promised_date"),
        @Index(name = "idx_ptp_agent_id", columnList = "agent_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PtpRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "agent_name", nullable = false)
    private String agentName;

    @Column(name = "loan_number", nullable = false)
    private String loanNumber;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "borrower_name", nullable = false)
    private String borrowerName;

    @Column(name = "promised_date", nullable = false)
    private LocalDate promisedDate;

    @Column(name = "promised_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal promisedAmount;

    @Column(name = "collected_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal collectedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private PtpStatus status = PtpStatus.PENDING;

    @Column(name = "contact_notes", columnDefinition = "TEXT")
    private String contactNotes;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "broken_reason", columnDefinition = "TEXT")
    private String brokenReason;

    @Column(name = "negotiated_amount", precision = 15, scale = 2)
    private BigDecimal negotiatedAmount;

    @Column(name = "floor_amount", precision = 15, scale = 2)
    private BigDecimal floorAmount;

    @Column(name = "evidence_call_id", length = 100)
    private String evidenceCallId;

    @Column(name = "consent_capture_id")
    private UUID consentCaptureId;

    @Column(name = "reminder_sent")
    @Builder.Default
    private Boolean reminderSent = false;

    @Column(name = "reminder_sent_at")
    private Instant reminderSentAt;

    @Column(name = "fulfilled_at")
    private Instant fulfilledAt;

    @Column(name = "broken_at")
    private Instant brokenAt;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Version
    private Long version;
}
