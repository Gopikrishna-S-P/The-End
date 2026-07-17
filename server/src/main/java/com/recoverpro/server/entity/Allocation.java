package com.recoverpro.server.entity;

import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.Disp;
import com.recoverpro.server.security.encryption.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "allocations",
        indexes = {
                @Index(name = "idx_allocations_file_upload_id", columnList = "file_upload_id"),
                @Index(name = "idx_allocations_organization_id", columnList = "organization_id"),
                @Index(name = "idx_allocations_loan_number", columnList = "loan_number"),
                @Index(name = "idx_allocations_status", columnList = "status"),
                @Index(name = "idx_allocations_is_deleted", columnList = "is_deleted")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Allocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_upload_id", nullable = false)
    private FileUpload fileUpload;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "loan_number", nullable = false, length = 100)
    private String loanNumber;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "borrower_name", nullable = false, length = 1024)
    private String borrowerName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private AllocationStatus status = AllocationStatus.UNASSIGNED;

    @Enumerated(EnumType.STRING)
    @Column(name = "latest_disposition", length = 30)
    private Disp latestDisposition;

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_data", columnDefinition = "jsonb")
    private Map<String, Object> dynamicData;

    @Column(name = "row_number")
    private Integer rowNumber;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by_user_id")
    private UUID deletedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "npa_flagged", nullable = false)
    @Builder.Default
    private Boolean npaFlagged = false;

    @Column(name = "total_due", precision = 15, scale = 2)
    private BigDecimal totalDue;

    @Column(name = "outstanding_amount", precision = 15, scale = 2)
    private BigDecimal outstandingAmount;

    @Column(name = "borrower_id")
    private UUID borrowerId;

    @Column(name = "cooling_off_until")
    private Instant coolingOffUntil;

    @Column(name = "restructured_from_id")
    private UUID restructuredFromId;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    public Boolean isNpaFlagged() {
        return npaFlagged;
    }

    public boolean isInCoolingOff() {
        return coolingOffUntil != null && coolingOffUntil.isAfter(Instant.now());
    }
}
