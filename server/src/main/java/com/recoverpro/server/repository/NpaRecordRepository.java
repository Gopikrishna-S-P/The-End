package com.recoverpro.server.repository;

import com.recoverpro.server.entity.NpaRecord;
import com.recoverpro.server.enums.NpaRiskLevel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NpaRecordRepository extends JpaRepository<NpaRecord, UUID> {

    Optional<NpaRecord> findByAllocationIdAndIsResolvedFalse(UUID allocationId);

    boolean existsByAllocationIdAndIsResolvedFalse(UUID allocationId);

    Page<NpaRecord> findByOrganizationIdAndIsResolvedFalseOrderByOverdueDaysDesc(
            UUID orgId, Pageable pageable);

    List<NpaRecord> findByOrganizationIdAndFlaggedDateAndIsResolvedFalse(
            UUID orgId, LocalDate flaggedDate);

    @Query("SELECT n FROM NpaRecord n WHERE n.organizationId = :orgId " +
           "AND n.isResolved = false " +
           "AND (:riskLevel IS NULL OR n.riskLevel = :riskLevel) " +
           "ORDER BY n.overdueDays DESC")
    Page<NpaRecord> findActiveWithFilters(
            @Param("orgId") UUID orgId,
            @Param("riskLevel") NpaRiskLevel riskLevel,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(n.outstandingAmount), 0) FROM NpaRecord n " +
           "WHERE n.organizationId = :orgId AND n.isResolved = false")
    BigDecimal sumOutstandingByOrg(@Param("orgId") UUID orgId);

    @Query("SELECT COUNT(n) FROM NpaRecord n WHERE n.organizationId = :orgId AND n.isResolved = false")
    Long countActiveByOrg(@Param("orgId") UUID orgId);

    @Query("SELECT n.riskLevel, COUNT(n) FROM NpaRecord n " +
           "WHERE n.organizationId = :orgId AND n.isResolved = false GROUP BY n.riskLevel")
    List<Object[]> countGroupedByRiskLevel(@Param("orgId") UUID orgId);

    @Query("SELECT n.riskLevel, COALESCE(SUM(n.outstandingAmount), 0) FROM NpaRecord n " +
           "WHERE n.organizationId = :orgId AND n.isResolved = false GROUP BY n.riskLevel")
    List<Object[]> amountGroupedByRiskLevel(@Param("orgId") UUID orgId);

    List<NpaRecord> findByAllocationIdIn(List<UUID> allocationIds);
}
