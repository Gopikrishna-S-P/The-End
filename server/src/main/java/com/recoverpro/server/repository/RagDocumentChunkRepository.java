package com.recoverpro.server.repository;

import com.recoverpro.server.entity.RagDocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface RagDocumentChunkRepository extends JpaRepository<RagDocumentChunk, UUID> {

    List<RagDocumentChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);

    /**
     * Sets the pgvector embedding column via a text literal cast
     * ({@code '[0.1,0.2,...]'::vector}) -- see {@link RagDocumentChunk}'s
     * class comment for why this isn't JPA-mapped directly.
     */
    @Modifying
    @Transactional
    @Query(value = "UPDATE rag_document_chunks SET embedding = CAST(:embedding AS vector) WHERE id = :id",
            nativeQuery = true)
    void setEmbedding(@Param("id") UUID id, @Param("embedding") String embedding);

    /** Cosine-similarity top-k search against ACTIVE documents only. */
    @Query(value = """
            SELECT c.content AS content, d.title AS documentTitle, d.id AS documentId
            FROM rag_document_chunks c
            JOIN rag_documents d ON d.id = c.document_id
            WHERE d.status = 'ACTIVE' AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> CAST(:queryEmbedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<ChunkSearchResult> searchTopK(@Param("queryEmbedding") String queryEmbedding, @Param("limit") int limit);

    interface ChunkSearchResult {
        String getContent();
        String getDocumentTitle();
        UUID getDocumentId();
    }
}
