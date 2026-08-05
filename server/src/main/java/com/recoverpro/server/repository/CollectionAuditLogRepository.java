package com.recoverpro.server.repository;

import com.recoverpro.server.entity.CollectionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CollectionAuditLogRepository extends JpaRepository<CollectionAuditLog, UUID> {

    List<CollectionAuditLog> findByCollectionIdOrderByCreatedAtAsc(UUID collectionId);

    List<CollectionAuditLog> findByCollectionIdInOrderByCreatedAtDesc(List<UUID> collectionIds);
}
