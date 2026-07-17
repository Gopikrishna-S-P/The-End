package com.recoverpro.server.entity;

import com.recoverpro.server.enums.Channel;
import com.recoverpro.server.enums.MessageTemplateStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "message_templates", indexes = {
        @Index(name = "idx_msg_template_org",         columnList = "organization_id"),
        @Index(name = "idx_msg_template_key_version", columnList = "template_key,version", unique = true),
        @Index(name = "idx_msg_template_status",      columnList = "status"),
        @Index(name = "idx_msg_template_channel",     columnList = "channel")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "template_key", nullable = false, length = 100)
    private String templateKey;

    @Column(name = "version", nullable = false, length = 30)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private Channel channel;

    @Column(name = "language", nullable = false, length = 8)
    private String language;

    @Column(name = "subject", length = 500)
    private String subject;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "dlt_template_id", length = 100)
    private String dltTemplateId;

    @Column(name = "whatsapp_namespace", length = 200)
    private String whatsappNamespace;

    @Column(name = "category", length = 30)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private MessageTemplateStatus status = MessageTemplateStatus.DRAFT;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "approved_by_user_id")
    private UUID approvedByUserId;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
