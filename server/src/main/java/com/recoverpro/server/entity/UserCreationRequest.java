package com.recoverpro.server.entity;

import com.recoverpro.server.security.encryption.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_creation_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCreationRequest {

    public enum RequestedRole {
        ORG_ADMIN, ORG_USER
    }

    public enum RequestStatus {
        PENDING, APPROVED, REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "requested_email", nullable = false, length = 255)
    private String requestedEmail;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "requested_first_name", nullable = false, length = 512)
    private String requestedFirstName;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "requested_last_name", nullable = false, length = 512)
    private String requestedLastName;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_role", nullable = false, length = 50)
    private RequestedRole requestedRole;

    /**
     * The specific staff role to assign on approval when requestedRole is ORG_USER (FO, CALLER, TL,
     * or MANAGER -- without the "ROLE_" prefix). Null for ORG_ADMIN requests, which assign
     * ROLE_ORG_ADMIN directly. requestedRole alone was never enough to approve a request: it's a
     * coarse category (who approves it), not an assignable role name.
     */
    @Column(name = "requested_staff_role", length = 50)
    private String requestedStaffRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "review_notes", length = 500)
    private String reviewNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_id")
    private User createdUser;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
