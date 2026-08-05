package com.recoverpro.server.entity;

import com.recoverpro.server.enums.Channel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_links", indexes = {
        @Index(name = "idx_pay_link_intent", columnList = "intent_id"),
        @Index(name = "idx_pay_link_token",  columnList = "token", unique = true),
        @Index(name = "idx_pay_link_expiry", columnList = "expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "intent_id", nullable = false)
    private UUID intentId;

    @Column(name = "token", nullable = false, length = 64, unique = true, updatable = false)
    private String token;

    @Column(name = "target_uri", nullable = false, columnDefinition = "TEXT")
    private String targetUri;

    @Enumerated(EnumType.STRING)
    @Column(name = "issued_via_channel", length = 20)
    private Channel issuedViaChannel;

    @Column(name = "single_use", nullable = false)
    @Builder.Default
    private boolean singleUse = true;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
