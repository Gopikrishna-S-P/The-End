package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.enums.CollectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.recoverpro.server.enums.PaymentMode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, UUID> {

    Optional<Collection> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.submittedBy = :agentId AND c.collectionDate = :date AND c.paymentMode = com.recoverpro.server.enums.PaymentMode.CASH AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    java.math.BigDecimal sumCashByAgentAndDate(@Param("agentId") UUID agentId, @Param("date") LocalDate date);

    Optional<Collection> findByIdAndIsDeletedFalse(UUID id);

    List<Collection> findByAllocationIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID allocationId);

    @Query("SELECT c FROM Collection c WHERE c.organizationId = :organizationId AND c.loanNumber = :loanNumber AND c.isDeleted = false ORDER BY c.collectionDate DESC, c.createdAt DESC")
    List<Collection> findByOrganizationIdAndLoanNumber(
            @Param("organizationId") UUID organizationId,
            @Param("loanNumber") String loanNumber);

    @Query("SELECT c FROM Collection c WHERE c.submittedBy = :agentId AND c.collectionDate = :date AND c.isDeleted = false")
    List<Collection> findByAgentAndDate(@Param("agentId") UUID agentId, @Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.submittedBy = :agentId AND c.collectionDate = :date AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    java.math.BigDecimal sumCollectionByAgentAndDate(@Param("agentId") UUID agentId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(c) FROM Collection c WHERE c.submittedBy = :agentId AND c.collectionDate = :date AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    long countCollectionsByAgentAndDate(@Param("agentId") UUID agentId, @Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.submittedBy = :agentId AND c.collectionDate >= :from AND c.collectionDate <= :to AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    java.math.BigDecimal sumCollectionByAgentBetweenDates(@Param("agentId") UUID agentId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COUNT(c) FROM Collection c WHERE c.submittedBy = :agentId AND c.collectionDate >= :from AND c.collectionDate <= :to AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    long countCollectionsByAgentBetweenDates(@Param("agentId") UUID agentId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT c FROM Collection c WHERE c.submittedBy = :agentId AND c.isDeleted = false")
    List<Collection> findAllByAgent(@Param("agentId") UUID agentId);

    long countByOrganizationIdAndStatusAndIsDeletedFalse(UUID organizationId, CollectionStatus status);

    @Query("SELECT COUNT(c) FROM Collection c WHERE c.organizationId = :orgId AND c.collectionDate >= :from AND c.collectionDate <= :to AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    long countByOrgAndDateRange(@Param("orgId") UUID orgId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.organizationId = :orgId AND c.collectionDate >= :from AND c.collectionDate <= :to AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    java.math.BigDecimal sumVolumeByOrgAndDateRange(@Param("orgId") UUID orgId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COUNT(c) FROM Collection c WHERE c.organizationId = :agencyId AND c.status = com.recoverpro.server.enums.CollectionStatus.PENDING_APPROVAL AND c.isDeleted = false")
    long countPendingApprovalsByAgencyId(@Param("agencyId") UUID agencyId);

    @Query("SELECT c.submittedBy, COUNT(c), COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.organizationId = :orgId AND c.collectionDate = :date AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED GROUP BY c.submittedBy")
    List<Object[]> countAndSumByAgentForOrgAndDate(@Param("orgId") UUID orgId, @Param("date") LocalDate date);

    @Query("SELECT c FROM Collection c WHERE c.allocationId IN :allocationIds AND c.isDeleted = false ORDER BY c.collectionDate DESC, c.createdAt DESC")
    List<Collection> findAllByAllocationIdsOrdered(@Param("allocationIds") List<UUID> allocationIds);

    @Query("SELECT c FROM Collection c WHERE " +
           "(:orgId IS NULL OR c.organizationId = :orgId) AND " +
           "(:agentId IS NULL OR c.submittedBy = :agentId) AND " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:paymentMode IS NULL OR c.paymentMode = :paymentMode) AND " +
           "(:fromDate IS NULL OR c.collectionDate >= :fromDate) AND " +
           "(:toDate IS NULL OR c.collectionDate <= :toDate) AND " +
           "c.isDeleted = false ORDER BY c.createdAt DESC")
    Page<Collection> findWithFilters(
            @Param("orgId") UUID orgId,
            @Param("agentId") UUID agentId,
            @Param("status") CollectionStatus status,
            @Param("paymentMode") PaymentMode paymentMode,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED")
    java.math.BigDecimal sumSystemWideVolume();

    @Query("SELECT FUNCTION('TO_CHAR', c.collectionDate, 'YYYY-MM'), COUNT(c), COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED AND c.collectionDate >= :from GROUP BY FUNCTION('TO_CHAR', c.collectionDate, 'YYYY-MM') ORDER BY FUNCTION('TO_CHAR', c.collectionDate, 'YYYY-MM') DESC")
    List<Object[]> findMonthlyTrendSystem(@Param("from") LocalDate from);

    @Query("SELECT c.organizationId, COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED GROUP BY c.organizationId ORDER BY COALESCE(SUM(c.amount), 0) DESC")
    List<Object[]> findTopOrgsByVolume();

    @Query("SELECT FUNCTION('TO_CHAR', c.collectionDate, 'YYYY-MM'), COUNT(c), COALESCE(SUM(c.amount), 0) FROM Collection c WHERE c.organizationId = :orgId AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED AND c.collectionDate >= :from GROUP BY FUNCTION('TO_CHAR', c.collectionDate, 'YYYY-MM') ORDER BY FUNCTION('TO_CHAR', c.collectionDate, 'YYYY-MM') DESC")
    List<Object[]> findMonthlyTrendByOrg(@Param("orgId") UUID orgId, @Param("from") LocalDate from);

    @Query("SELECT u.firstName, u.lastName, COALESCE(SUM(c.amount), 0), COUNT(c) FROM Collection c JOIN User u ON u.id = c.submittedBy WHERE c.organizationId = :orgId AND c.collectionDate >= :from AND c.isDeleted = false AND c.status <> com.recoverpro.server.enums.CollectionStatus.CANCELLED GROUP BY u.firstName, u.lastName ORDER BY COALESCE(SUM(c.amount), 0) DESC")
    List<Object[]> findTopAgentsByOrg(@Param("orgId") UUID orgId, @Param("from") LocalDate from);
}
