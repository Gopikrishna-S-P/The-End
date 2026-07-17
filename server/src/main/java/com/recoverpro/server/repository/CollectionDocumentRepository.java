package com.recoverpro.server.repository;

import com.recoverpro.server.entity.CollectionDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollectionDocumentRepository extends JpaRepository<CollectionDocument, UUID> {

    List<CollectionDocument> findByCollectionIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID collectionId);

    List<CollectionDocument> findByCollectionIdInAndIsDeletedFalseOrderByCreatedAtAsc(List<UUID> collectionIds);

    Optional<CollectionDocument> findByCollectionIdAndIdAndIsDeletedFalse(UUID collectionId, UUID id);

    int countByCollectionIdAndIsDeletedFalse(UUID collectionId);

    Optional<CollectionDocument> findByIdAndIsDeletedFalse(UUID id);

    @Modifying
    @Query("UPDATE CollectionDocument d SET d.isDeleted = true WHERE d.id = :id")
    void softDeleteById(@Param("id") UUID id);
}
