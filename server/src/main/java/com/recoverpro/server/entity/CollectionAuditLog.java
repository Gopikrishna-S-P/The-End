package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "collection_audit_logs", indexes = {
        @Index(name = "idx_col_audit_collection_id", columnList = "collection_id"),
        @Index(name = "idx_col_audit_performed_by",  columnList = "performed_by")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "collection_id", nullable = false)
    private UUID collectionId;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    @Column(name = "previous_status", length = 20)
    private String previousStatus;

    @Column(name = "new_status", length = 20)
    private String newStatus;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
