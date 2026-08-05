package com.recoverpro.server.entity;

import com.recoverpro.server.enums.PaymentRail;
import com.recoverpro.server.enums.PaymentTransactionState;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_transactions", indexes = {
        @Index(name = "idx_pay_txn_intent",     columnList = "intent_id"),
        @Index(name = "idx_pay_txn_state",      columnList = "state"),
        @Index(name = "idx_pay_txn_provider",   columnList = "provider_txn_id"),
        @Index(name = "idx_pay_txn_utr",        columnList = "utr"),
        @Index(name = "idx_pay_txn_value_date", columnList = "value_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "intent_id", nullable = false)
    private UUID intentId;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider;

    @Column(name = "provider_txn_id", length = 200)
    private String providerTxnId;

    /** Bank Unique Transaction Reference (NPCI). */
    @Column(name = "utr", length = 50)
    private String utr;

    @Enumerated(EnumType.STRING)
    @Column(name = "rail", nullable = false, length = 20)
    private PaymentRail rail;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 20)
    @Builder.Default
    private PaymentTransactionState state = PaymentTransactionState.INITIATED;

    @Column(name = "failure_code", length = 50)
    private String failureCode;

    @Column(name = "failure_message", length = 500)
    private String failureMessage;

    @Column(name = "value_date")
    private Instant valueDate;

    @Column(name = "captured_at")
    private Instant capturedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
