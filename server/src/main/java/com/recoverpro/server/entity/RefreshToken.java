package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens",
        indexes = @Index(name = "idx_refresh_token_hash", columnList = "token_hash"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "device_info", length = 500)
    private String deviceInfo;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "token_prefix", length = 16)
    private String tokenPrefix;

    /** Stable per-device fingerprint; used by SessionAnomalyDetector for impossible-travel detection */
    @Column(name = "device_id", length = 128)
    private String deviceId;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /** ISO-3166-1 alpha-2 country code resolved at issue time; null = resolution failed */
    @Column(name = "geo_country", length = 2)
    private String geoCountry;

    /** Set by SessionAnomalyDetector when a refresh trips the impossible-travel rule */
    @Column(name = "anomaly_flagged", nullable = false)
    @Builder.Default
    private boolean anomalyFlagged = false;

    @Column(name = "anomaly_reason", length = 500)
    private String anomalyReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !revoked && !isExpired();
    }
}
