package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.enums.AllocationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AllocationRepository extends JpaRepository<Allocation, UUID> {

    @Query(value =
            "SELECT a FROM Allocation a " +
            "LEFT JOIN FETCH a.fileUpload " +
            "LEFT JOIN FETCH a.organization " +
            "WHERE a.organization.id = :organizationId " +
            "AND a.isDeleted = false " +
            "AND (:statusStr IS NULL OR CAST(a.status AS String) = :statusStr) " +
            "AND (:fileUploadId IS NULL OR a.fileUpload.id = :fileUploadId) " +
            "AND (:assignedToUserId IS NULL OR a.assignedToUserId = :assignedToUserId) " +
            "AND (:searchPattern IS NULL " +
            "     OR LOWER(a.loanNumber) LIKE :searchPattern " +
            "     OR a.id IN (SELECT t.allocationId FROM AllocationNameSearchToken t WHERE t.tokenHash = :searchTermHash))",
           countQuery =
            "SELECT COUNT(a) FROM Allocation a " +
            "WHERE a.organization.id = :organizationId " +
            "AND a.isDeleted = false " +
            "AND (:statusStr IS NULL OR CAST(a.status AS String) = :statusStr) " +
            "AND (:fileUploadId IS NULL OR a.fileUpload.id = :fileUploadId) " +
            "AND (:assignedToUserId IS NULL OR a.assignedToUserId = :assignedToUserId) " +
            "AND (:searchPattern IS NULL " +
            "     OR LOWER(a.loanNumber) LIKE :searchPattern " +
            "     OR a.id IN (SELECT t.allocationId FROM AllocationNameSearchToken t WHERE t.tokenHash = :searchTermHash))")
    Page<Allocation> findAllWithFilters(
            @Param("organizationId") UUID organizationId,
            @Param("statusStr") String statusStr,
            @Param("fileUploadId") UUID fileUploadId,
            @Param("assignedToUserId") UUID assignedToUserId,
            @Param("searchPattern") String searchPattern,
            @Param("searchTermHash") String searchTermHash,
            Pageable pageable);

    Optional<Allocation> findByIdAndIsDeletedFalse(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Allocation a WHERE a.id = :id AND a.isDeleted = false")
    Optional<Allocation> findByIdAndIsDeletedFalseForUpdate(@Param("id") UUID id);

    @Query("SELECT a FROM Allocation a WHERE a.fileUpload.id = :fileUploadId AND a.isDeleted = false")
    List<Allocation> findAllByFileUploadId(@Param("fileUploadId") UUID fileUploadId);

    @Modifying
    @Query("UPDATE Allocation a SET a.isDeleted = true, a.deletedAt = CURRENT_TIMESTAMP, " +
            "a.deletedByUserId = :userId WHERE a.id = :id")
    void softDelete(@Param("id") UUID id, @Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE Allocation a SET a.isDeleted = true, a.deletedAt = CURRENT_TIMESTAMP, " +
            "a.deletedByUserId = :userId WHERE a.fileUpload.id = :fileUploadId AND a.isDeleted = false")
    void softDeleteAllByFileUploadId(@Param("fileUploadId") UUID fileUploadId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.fileUpload.id = :fileUploadId AND a.isDeleted = false")
    long countByFileUploadId(@Param("fileUploadId") UUID fileUploadId);

    @Query("SELECT a FROM Allocation a WHERE a.fileUpload.id = :fileUploadId AND a.isDeleted = false ORDER BY a.rowNumber ASC")
    Page<Allocation> findAllByFileUploadIdPaged(@Param("fileUploadId") UUID fileUploadId, Pageable pageable);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.isDeleted = false")
    long countByIsDeletedFalse();

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.isDeleted = false")
    long countByDeletedFalse();

    @Query("SELECT a FROM Allocation a WHERE a.borrowerId = :borrowerId AND a.isDeleted = false ORDER BY a.createdAt DESC")
    List<Allocation> findByBorrowerIdAndIsDeletedFalse(@Param("borrowerId") UUID borrowerId);

    @Query(value = "SELECT DISTINCT jsonb_object_keys(dynamic_data) " +
                   "FROM allocations " +
                   "WHERE file_upload_id = :uploadId AND is_deleted = false AND dynamic_data IS NOT NULL " +
                   "ORDER BY 1",
           nativeQuery = true)
    List<String> findColumnNamesByFileUploadId(@Param("uploadId") UUID uploadId);

    @Query("SELECT COALESCE(MAX(a.rowNumber), 0) FROM Allocation a " +
           "WHERE a.fileUpload.id = :fileUploadId AND a.isDeleted = false")
    Integer findMaxRowNumberByFileUploadId(@Param("fileUploadId") UUID fileUploadId);

    @Modifying
    @Query(value = "UPDATE allocations " +
                   "SET dynamic_data = COALESCE(dynamic_data, '{}' ::jsonb) || jsonb_build_object(:columnName, :defaultValue) " +
                   "WHERE file_upload_id = :uploadId AND is_deleted = false",
           nativeQuery = true)
    void addColumnToAllRows(@Param("uploadId") UUID uploadId,
                            @Param("columnName") String columnName,
                            @Param("defaultValue") String defaultValue);

    @Modifying
    @Query(value = "UPDATE allocations SET dynamic_data = dynamic_data - :columnName " +
                   "WHERE file_upload_id = :uploadId AND is_deleted = false",
           nativeQuery = true)
    void removeColumnFromAllRows(@Param("uploadId") UUID uploadId,
                                 @Param("columnName") String columnName);

    @Query("SELECT a FROM Allocation a WHERE a.organization.id = :orgId " +
           "AND a.loanNumber IN :loanNumbers AND a.isDeleted = false")
    List<Allocation> findByOrganizationIdAndLoanNumberIn(@Param("orgId") UUID orgId,
                                                         @Param("loanNumbers") Collection<String> loanNumbers);

    @Query("SELECT a.id FROM Allocation a WHERE a.organization.id = :orgId " +
           "AND a.loanNumber = :loanNumber AND a.isDeleted = false")
    List<UUID> findIdsByOrganizationIdAndLoanNumber(@Param("orgId") UUID orgId,
                                                    @Param("loanNumber") String loanNumber);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.organization.id = :orgId AND a.isDeleted = false")
    long countByOrgId(@Param("orgId") UUID orgId);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.organization.id = :orgId AND a.status = :status AND a.isDeleted = false")
    long countByOrgIdAndStatus(@Param("orgId") UUID orgId, @Param("status") AllocationStatus status);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.organization.id = :orgId AND a.npaFlagged = true AND a.isDeleted = false")
    long countNpaByOrgId(@Param("orgId") UUID orgId);

    @Query("SELECT COALESCE(SUM(a.outstandingAmount), 0) FROM Allocation a WHERE a.organization.id = :orgId AND a.isDeleted = false")
    java.math.BigDecimal sumOutstandingByOrgId(@Param("orgId") UUID orgId);

    @Query("SELECT a FROM Allocation a WHERE a.organization.id = :orgId AND a.isDeleted = false")
    List<Allocation> findByOrganizationIdAndIsDeletedFalse(@Param("orgId") UUID orgId);

    @Query("SELECT a FROM Allocation a WHERE a.organization.id = :orgId AND a.isDeleted = false ORDER BY a.createdAt ASC")
    org.springframework.data.domain.Slice<Allocation> findAllByOrganizationIdPaged(@Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(a.outstandingAmount), 0) FROM Allocation a WHERE a.assignedToUserId = :agentId AND a.isDeleted = false")
    java.math.BigDecimal sumOutstandingByAgentId(@Param("agentId") UUID agentId);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.organization.id = :orgId AND a.fileUpload.id = :fileUploadId AND a.isDeleted = false")
    long countByOrgIdAndFile(@Param("orgId") UUID orgId, @Param("fileUploadId") UUID fileUploadId);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.organization.id = :orgId AND a.fileUpload.id = :fileUploadId AND a.status = :status AND a.isDeleted = false")
    long countByOrgIdAndStatusAndFile(@Param("orgId") UUID orgId, @Param("status") AllocationStatus status, @Param("fileUploadId") UUID fileUploadId);

    @Query("SELECT COUNT(a) FROM Allocation a WHERE a.organization.id = :orgId AND a.fileUpload.id = :fileUploadId AND a.npaFlagged = true AND a.isDeleted = false")
    long countNpaByOrgIdAndFile(@Param("orgId") UUID orgId, @Param("fileUploadId") UUID fileUploadId);

    @Query("SELECT COALESCE(SUM(a.outstandingAmount), 0) FROM Allocation a WHERE a.organization.id = :orgId AND a.fileUpload.id = :fileUploadId AND a.isDeleted = false")
    java.math.BigDecimal sumOutstandingByOrgIdAndFile(@Param("orgId") UUID orgId, @Param("fileUploadId") UUID fileUploadId);

    @Query(value =
            "SELECT CASE " +
            "  WHEN a.created_at >= :d30 THEN '0-30d' " +
            "  WHEN a.created_at >= :d60 THEN '30-60d' " +
            "  WHEN a.created_at >= :d90 THEN '60-90d' " +
            "  ELSE '90d+' END AS bucket, COUNT(*) AS cnt " +
            "FROM allocations a " +
            "WHERE a.organization_id = :orgId AND a.is_deleted = false " +
            "GROUP BY 1", nativeQuery = true)
    List<Object[]> findCaseAgeBuckets(@Param("orgId") UUID orgId,
                                      @Param("d30") Instant d30,
                                      @Param("d60") Instant d60,
                                      @Param("d90") Instant d90);

    @Query(value =
            "SELECT CASE " +
            "  WHEN a.created_at >= :d30 THEN '0-30d' " +
            "  WHEN a.created_at >= :d60 THEN '30-60d' " +
            "  WHEN a.created_at >= :d90 THEN '60-90d' " +
            "  ELSE '90d+' END AS bucket, COUNT(*) AS cnt " +
            "FROM allocations a " +
            "WHERE a.organization_id = :orgId AND a.file_upload_id = :fileUploadId AND a.is_deleted = false " +
            "GROUP BY 1", nativeQuery = true)
    List<Object[]> findCaseAgeBucketsByFile(@Param("orgId") UUID orgId,
                                            @Param("fileUploadId") UUID fileUploadId,
                                            @Param("d30") Instant d30,
                                            @Param("d60") Instant d60,
                                            @Param("d90") Instant d90);
}
