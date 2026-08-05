package com.recoverpro.server.entity;

import com.recoverpro.server.enums.NpaRiskLevel;
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
@Table(name = "npa_records", indexes = {
        @Index(name = "idx_npa_org_date",    columnList = "organization_id, flagged_date"),
        @Index(name = "idx_npa_allocation",  columnList = "allocation_id"),
        @Index(name = "idx_npa_risk_level",  columnList = "risk_level")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NpaRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "loan_number", nullable = false, length = 50)
    private String loanNumber;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "borrower_name", nullable = false, length = 255)
    private String borrowerName;

    @Column(name = "outstanding_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal outstandingAmount;

    @Column(name = "overdue_days", nullable = false)
    private Integer overdueDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 10)
    private NpaRiskLevel riskLevel;

    @Column(name = "flagged_date", nullable = false)
    private LocalDate flaggedDate;

    @Column(name = "last_payment_date")
    private LocalDate lastPaymentDate;

    @Column(name = "last_payment_amount", precision = 18, scale = 2)
    private BigDecimal lastPaymentAmount;

    @Column(name = "assigned_agent_id")
    private UUID assignedAgentId;

    @Column(name = "is_resolved", nullable = false)
    @Builder.Default
    private Boolean isResolved = false;

    @Column(name = "resolved_date")
    private LocalDate resolvedDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
