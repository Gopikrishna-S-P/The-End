package com.recoverpro.server.entity;

import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.security.encryption.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ptp_history", indexes = {
        @Index(name = "idx_ptp_history_ptp_id", columnList = "ptp_id"),
        @Index(name = "idx_ptp_history_allocation_id", columnList = "allocation_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PtpHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "ptp_id", nullable = false)
    private UUID ptpId;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 30)
    private PtpStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 30)
    private PtpStatus newStatus;

    @Column(name = "collected_amount_snapshot", precision = 15, scale = 2)
    private BigDecimal collectedAmountSnapshot;

    @Column(name = "change_reason", columnDefinition = "TEXT")
    private String changeReason;

    @Column(name = "changed_by", nullable = false)
    private UUID changedBy;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "changed_by_name", nullable = false)
    private String changedByName;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;
}
