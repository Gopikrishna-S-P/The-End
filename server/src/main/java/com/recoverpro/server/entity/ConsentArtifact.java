package com.recoverpro.server.entity;

import com.recoverpro.server.enums.ConsentPurpose;
import com.recoverpro.server.enums.ConsentScope;
import com.recoverpro.server.enums.ConsentStatus;
import com.recoverpro.server.util.AuditHashUtil;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "consent_artifacts", indexes = {
        @Index(name = "idx_consent_borrower",         columnList = "borrower_id"),
        @Index(name = "idx_consent_borrower_purpose", columnList = "borrower_id,purpose,scope"),
        @Index(name = "idx_consent_status",           columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsentArtifact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "borrower_id", nullable = false, updatable = false)
    private UUID borrowerId;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 50, updatable = false)
    private ConsentPurpose purpose;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 30, updatable = false)
    private ConsentScope scope;

    @Column(name = "terms_text", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String termsText;

    @Column(name = "terms_version", nullable = false, length = 30, updatable = false)
    private String termsVersion;

    @Column(name = "signed_hash", nullable = false, length = 64, updatable = false)
    private String signedHash;

    @Column(name = "evidence_ref", length = 500, updatable = false)
    private String evidenceRef;

    @Column(name = "granted_at", nullable = false, updatable = false)
    private Instant grantedAt;

    @Column(name = "expires_at", updatable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_reason", length = 500)
    private String revokedReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ConsentStatus status = ConsentStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onPersist() {
        if (id == null) id = UUID.randomUUID();
        if (grantedAt == null) grantedAt = Instant.now();
        if (createdAt == null) createdAt = Instant.now();
        if (signedHash == null) {
            String canonical = AuditHashUtil.canonical(
                    null, borrowerId, purpose, scope, termsVersion, termsText, grantedAt, expiresAt);
            this.signedHash = AuditHashUtil.sha256Hex(canonical);
        }
    }
}
