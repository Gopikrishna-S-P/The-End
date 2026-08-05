package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AgentPerformanceSnapshot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentPerformanceSnapshotRepository extends JpaRepository<AgentPerformanceSnapshot, UUID> {

    Optional<AgentPerformanceSnapshot> findByAgentIdAndSnapshotDate(UUID agentId, LocalDate snapshotDate);

    Page<AgentPerformanceSnapshot> findByOrganizationIdAndSnapshotDate(UUID orgId, LocalDate date, Pageable pageable);

    List<AgentPerformanceSnapshot> findByOrganizationIdAndSnapshotDateOrderByEfficiencyScoreDesc(UUID orgId, LocalDate date);

    @Query("SELECT s FROM AgentPerformanceSnapshot s WHERE s.organizationId = :orgId AND s.snapshotDate >= :from AND s.snapshotDate <= :to")
    List<AgentPerformanceSnapshot> findByOrgAndDateRange(@Param("orgId") UUID orgId,
                                                          @Param("from") LocalDate from,
                                                          @Param("to") LocalDate to);
}
