package com.recoverpro.server.entity;

import com.recoverpro.server.enums.PaymentBucket;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_splits", indexes = {
        @Index(name = "idx_pay_split_txn",    columnList = "txn_id"),
        @Index(name = "idx_pay_split_bucket", columnList = "bucket")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "txn_id", nullable = false)
    private UUID txnId;

    @Enumerated(EnumType.STRING)
    @Column(name = "bucket", nullable = false, length = 30)
    private PaymentBucket bucket;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
