package com.recoverpro.server.entity;

import com.recoverpro.server.enums.RagDocumentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A platform compliance document (RBI circular, DLG guideline, company SOP)
 * uploaded by a platform admin and made searchable to Lucien via
 * {@code SearchKnowledgeBaseTool}. Global -- not organization-scoped.
 *
 * Re-uploading a logical document (e.g. an updated circular) creates a new
 * row with {@code supersedesDocumentId} set; the old row flips to
 * SUPERSEDED so it drops out of search immediately.
 */
@Entity
@Table(name = "rag_documents", indexes = {
        @Index(name = "idx_rag_documents_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private RagDocumentStatus status = RagDocumentStatus.PENDING;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "uploaded_by_user_id", nullable = false)
    private UUID uploadedByUserId;

    @Column(name = "supersedes_document_id")
    private UUID supersedesDocumentId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
