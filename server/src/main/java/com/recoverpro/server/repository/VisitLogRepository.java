package com.recoverpro.server.repository;

import com.recoverpro.server.entity.VisitLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface VisitLogRepository extends JpaRepository<VisitLog, UUID> {

    List<VisitLog> findByAllocationIdAndIsDeletedFalse(UUID allocationId);

    /** Batch dedup for historical imports - narrows on both axes so the fetch stays bounded. */
    List<VisitLog> findByAllocationIdInAndVisitDateInAndIsDeletedFalse(
            Set<UUID> allocationIds, Set<LocalDate> visitDates);

    @Query("""
            SELECT v FROM VisitLog v
            WHERE v.allocationId IN :allocationIds
              AND v.isDeleted = false
            ORDER BY v.visitDate DESC, v.visitTime DESC, v.createdAt DESC
            """)
    List<VisitLog> findAllByAllocationIdsOrdered(@Param("allocationIds") List<UUID> allocationIds);

    @Query("""
            SELECT v FROM VisitLog v
            WHERE v.organizationId = :organizationId
              AND v.loanNumber = :loanNumber
              AND v.isDeleted = false
            ORDER BY v.visitDate DESC, v.visitTime DESC, v.createdAt DESC
            """)
    List<VisitLog> findLoanHistory(@Param("organizationId") UUID organizationId,
                                   @Param("loanNumber") String loanNumber);

    List<VisitLog> findByAgentIdAndIsDeletedFalse(UUID agentId);

    Page<VisitLog> findByAgentIdAndIsDeletedFalse(UUID agentId, Pageable pageable);

    Page<VisitLog> findByOrganizationIdAndIsDeletedFalse(UUID organizationId, Pageable pageable);

    List<VisitLog> findByAgentIdAndVisitDateAndIsDeletedFalse(UUID agentId, LocalDate visitDate);

    Optional<VisitLog> findByIdAndIsDeletedFalse(UUID id);

    List<VisitLog> findByCollectionIdAndIsDeletedFalse(UUID collectionId);

    List<VisitLog> findByPtpIdAndIsDeletedFalse(UUID ptpId);

    long countByOrganizationIdAndApprovalStatusAndCreatedAtBeforeAndIsDeletedFalse(
            UUID organizationId, com.recoverpro.server.enums.ApprovalStatus approvalStatus, java.time.Instant cutoff);

    List<VisitLog> findByVisitDateBetweenAndIsDeletedFalse(LocalDate start, LocalDate end);

    @Query("SELECT v FROM VisitLog v WHERE v.agentId = :agentId AND v.visitDate = :date AND v.isDeleted = false")
    List<VisitLog> findTodayVisitsByAgent(@Param("agentId") UUID agentId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(v) FROM VisitLog v WHERE v.agentId = :agentId AND v.visitDate = :date AND v.isDeleted = false")
    long countContactedTodayByAgent(@Param("agentId") UUID agentId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(v) FROM VisitLog v WHERE v.agentId = :agentId AND v.visitDate = :date AND v.visitOutcome = 'COLLECTED' AND v.isDeleted = false")
    long countCollectedTodayByAgent(@Param("agentId") UUID agentId, @Param("date") LocalDate date);

    @Modifying
    @Query("UPDATE VisitLog v SET v.isDeleted = true WHERE v.id = :id")
    void softDeleteById(@Param("id") UUID id);

    @Query("""
            SELECT v FROM VisitLog v
            WHERE v.allocationId = :allocationId
              AND v.lastVisitedAddress IS NOT NULL
              AND v.isDeleted = false
            ORDER BY v.visitDate DESC, v.createdAt DESC
            """)
    List<VisitLog> findVisitsWithAddressByAllocationId(@Param("allocationId") UUID allocationId,
                                                       Pageable pageable);

    default Optional<String> findLastVisitedAddress(UUID allocationId) {
        return findVisitsWithAddressByAllocationId(allocationId, Pageable.ofSize(1))
                .stream().map(VisitLog::getLastVisitedAddress).findFirst();
    }

    @Query("""
            SELECT v FROM VisitLog v
            WHERE v.allocationId = :allocationId
              AND v.latitude IS NOT NULL
              AND v.longitude IS NOT NULL
              AND v.isDeleted = false
            ORDER BY v.visitDate DESC, v.createdAt DESC
            """)
    List<VisitLog> findVisitsWithLocationByAllocationId(@Param("allocationId") UUID allocationId,
                                                        Pageable pageable);

    default Optional<VisitLog> findLastLocationVisit(UUID allocationId) {
        return findVisitsWithLocationByAllocationId(allocationId, Pageable.ofSize(1))
                .stream().findFirst();
    }

    @Query("SELECT FUNCTION('TO_CHAR', v.visitDate, 'YYYY-MM') as month, COUNT(v) FROM VisitLog v WHERE v.organizationId = :orgId AND v.isDeleted = false AND v.visitDate >= :from GROUP BY FUNCTION('TO_CHAR', v.visitDate, 'YYYY-MM') ORDER BY month DESC")
    List<Object[]> findMonthlyTrendByOrg(@Param("orgId") UUID orgId, @Param("from") LocalDate from);

    @Query("SELECT COUNT(v) FROM VisitLog v WHERE v.organizationId = :orgId AND v.visitDate = :date AND v.isDeleted = false")
    long countByOrganizationIdAndVisitDate(@Param("orgId") UUID orgId, @Param("date") LocalDate date);

    @Query("SELECT v.agentId, COUNT(v) FROM VisitLog v WHERE v.organizationId = :orgId AND v.visitDate = :date AND v.isDeleted = false GROUP BY v.agentId")
    List<Object[]> countByAgentForOrgAndDate(@Param("orgId") UUID orgId, @Param("date") LocalDate date);
}
