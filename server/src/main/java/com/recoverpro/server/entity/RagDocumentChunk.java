package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * One chunk of a {@link RagDocument}'s extracted text. The {@code embedding}
 * pgvector column is intentionally NOT mapped here -- Hibernate 6 has no
 * built-in pgvector type, and hand-rolling a custom UserType couldn't be
 * verified against a real pgvector instance in this environment. Embedding
 * writes/reads go through {@code RagDocumentChunkRepository}'s native
 * queries instead, which cast a plain text vector literal
 * (e.g. {@code '[0.1,0.2,...]'}) to {@code vector} in SQL -- Postgres's own
 * pgvector extension parses that text form, no JDBC-level vector type needed.
 */
@Entity
@Table(name = "rag_document_chunks", indexes = {
        @Index(name = "idx_rag_chunks_document", columnList = "document_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagDocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "token_count")
    private Integer tokenCount;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
