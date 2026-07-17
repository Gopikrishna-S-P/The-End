package com.recoverpro.server.repository;

import com.recoverpro.server.entity.RagDocument;
import com.recoverpro.server.enums.RagDocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RagDocumentRepository extends JpaRepository<RagDocument, UUID> {

    List<RagDocument> findByStatusOrderByCreatedAtDesc(RagDocumentStatus status);

    List<RagDocument> findAllByOrderByCreatedAtDesc();
}
