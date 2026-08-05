package com.recoverpro.server.entity;

import com.recoverpro.server.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_notifications", indexes = {
        @Index(name = "idx_notif_recipient",      columnList = "recipient_id"),
        @Index(name = "idx_notif_recipient_read", columnList = "recipient_id, read_at"),
        @Index(name = "idx_notif_org_created",    columnList = "organization_id, created_at"),
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    /** null for platform-level notifications */
    @Column(name = "organization_id")
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private NotificationType type;

    /** P0 = urgent, P3 = informational */
    @Column(nullable = false, length = 2)
    @Builder.Default
    private String priority = "P2";

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 512)
    private String body;

    @Column(name = "deep_link", length = 512)
    private String deepLink;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "snoozed_until")
    private Instant snoozedUntil;

    @Column(name = "dismissed", nullable = false)
    @Builder.Default
    private boolean dismissed = false;
}
