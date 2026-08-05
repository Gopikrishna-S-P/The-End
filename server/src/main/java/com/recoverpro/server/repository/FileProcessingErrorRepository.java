package com.recoverpro.server.repository;

import com.recoverpro.server.entity.FileProcessingError;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FileProcessingErrorRepository extends JpaRepository<FileProcessingError, UUID> {

    @Query("SELECT e FROM FileProcessingError e WHERE e.fileUpload.id = :fileUploadId ORDER BY e.rowNumber ASC")
    Page<FileProcessingError> findAllByFileUploadId(@Param("fileUploadId") UUID fileUploadId, Pageable pageable);

    @Query("SELECT COUNT(e) FROM FileProcessingError e WHERE e.fileUpload.id = :fileUploadId")
    long countByFileUploadId(@Param("fileUploadId") UUID fileUploadId);

    void deleteAllByFileUploadId(UUID fileUploadId);
}
