package com.recoverpro.server.repository;

import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.enums.FileUploadStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FileUploadRepository extends JpaRepository<FileUpload, UUID> {

    @Query("SELECT f FROM FileUpload f WHERE f.organization.id = :organizationId AND f.isDeleted = false ORDER BY f.createdAt DESC")
    Page<FileUpload> findAllByOrganizationIdAndNotDeleted(@Param("organizationId") UUID organizationId, Pageable pageable);

    Optional<FileUpload> findByIdAndIsDeletedFalse(UUID id);

    boolean existsBySha256HashAndOrganizationIdAndIsDeletedFalse(String sha256Hash, UUID organizationId);

    Optional<FileUpload> findFirstBySha256HashAndOrganizationIdAndIsDeletedFalse(String sha256Hash, UUID organizationId);

    @Query("SELECT f FROM FileUpload f WHERE f.status = :status AND f.isDeleted = false")
    List<FileUpload> findAllByStatus(@Param("status") FileUploadStatus status);

    @Query("""
            SELECT f FROM FileUpload f
            WHERE f.organization.id = :organizationId
              AND f.isDeleted = false
              AND f.status IN (com.recoverpro.server.enums.FileUploadStatus.COMPLETED,
                               com.recoverpro.server.enums.FileUploadStatus.PARTIALLY_COMPLETED)
            ORDER BY f.createdAt DESC
            """)
    List<FileUpload> findActiveCandidates(@Param("organizationId") UUID organizationId, Pageable pageable);

    default Optional<FileUpload> findActiveDataset(UUID organizationId) {
        return findActiveCandidates(organizationId, org.springframework.data.domain.PageRequest.of(0, 1))
                .stream().findFirst();
    }

    @Modifying
    @Query("UPDATE FileUpload f SET f.isDeleted = true, f.deletedAt = CURRENT_TIMESTAMP, " +
            "f.deletedByUserId = :userId WHERE f.id = :id")
    void softDelete(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT COUNT(f) FROM FileUpload f WHERE f.isDeleted = false")
    long countActive();

    @Query("SELECT COALESCE(SUM(f.successfulRows), 0) FROM FileUpload f WHERE f.isDeleted = false")
    long sumSuccessfulRows();

    @Query("SELECT COUNT(f) FROM FileUpload f WHERE f.isDeleted = false AND f.createdAt >= :since")
    long countSince(@Param("since") Instant since);

    @Modifying
    @Transactional
    @Query("UPDATE FileUpload f SET f.processedRows = :processedRows, f.successfulRows = :successfulRows, " +
            "f.failedRows = :failedRows, f.status = :status WHERE f.id = :id")
    void updateProgress(@Param("id") UUID id,
                        @Param("processedRows") Integer processedRows,
                        @Param("successfulRows") Integer successfulRows,
                        @Param("failedRows") Integer failedRows,
                        @Param("status") FileUploadStatus status);

    @Modifying
    @Transactional
    @Query("UPDATE FileUpload f SET f.autoAssignedCount = :assigned, f.autoAssignFailed = :failed WHERE f.id = :id")
    void updateAutoAssignCounts(@Param("id") UUID id,
                                @Param("assigned") Integer assigned,
                                @Param("failed") Integer failed);
}
