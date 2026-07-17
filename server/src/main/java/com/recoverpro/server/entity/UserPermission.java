package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "permission_id"}),
        indexes = {
                @Index(name = "idx_up_user_id", columnList = "user_id"),
                @Index(name = "idx_up_permission_id", columnList = "permission_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by")
    private User grantedBy;

    @Column(name = "is_granted", nullable = false)
    @Builder.Default
    private boolean isGranted = true;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "reason", length = 500)
    private String reason;

    @CreationTimestamp
    @Column(name = "granted_at", updatable = false)
    private Instant grantedAt;

    public boolean isValid() {
        if (expiresAt == null) return true;
        return Instant.now().isBefore(expiresAt);
    }
}
