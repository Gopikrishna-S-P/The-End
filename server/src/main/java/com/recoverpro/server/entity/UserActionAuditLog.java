package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Entity
@Table(name = "user_action_audit_logs", indexes = {
        @Index(name = "idx_user_action_audit_user_id",    columnList = "user_id"),
        @Index(name = "idx_user_action_audit_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserActionAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "previous_hash", length = 64)
    private String previousHash;

    @Column(name = "row_hash", length = 64)
    private String rowHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public void computeHash() {
        String payload = userId + "|" + action + "|" + details + "|"
                + (createdAt != null ? createdAt.toString() : "")
                + "|" + (previousHash != null ? previousHash : "GENESIS");
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            this.rowHash = HexFormat.of().formatHex(md.digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
