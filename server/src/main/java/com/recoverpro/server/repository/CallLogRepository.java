package com.recoverpro.server.repository;

import com.recoverpro.server.entity.CallLog;
import com.recoverpro.server.enums.CallOutcome;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CallLogRepository extends JpaRepository<CallLog, UUID> {

    List<CallLog> findByAllocationIdOrderByInitiatedAtDesc(UUID allocationId);

    @Query("SELECT cl FROM CallLog cl WHERE cl.organizationId = :orgId AND " +
           "(:agentId IS NULL OR cl.agentId = :agentId) AND " +
           "(:outcome IS NULL OR cl.outcome = :outcome) AND " +
           "(:fromDate IS NULL OR cl.initiatedAt >= :fromDate) AND " +
           "(:toDate IS NULL OR cl.initiatedAt <= :toDate) " +
           "ORDER BY cl.initiatedAt DESC")
    Page<CallLog> findWithFilters(
            @Param("orgId") UUID orgId,
            @Param("agentId") UUID agentId,
            @Param("outcome") CallOutcome outcome,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable);
}
