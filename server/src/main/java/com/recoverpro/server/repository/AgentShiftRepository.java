package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AgentShift;
import com.recoverpro.server.enums.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentShiftRepository extends JpaRepository<AgentShift, UUID> {

    Optional<AgentShift> findTopByAgentIdAndStatusOrderByStartedAtDesc(UUID agentId, ShiftStatus status);

    List<AgentShift> findByOrganizationIdAndStatus(UUID organizationId, ShiftStatus status);

    /** Agents with an ACTIVE shift that started before the given threshold — used by the auto-end sweep */
    @Query("SELECT s FROM AgentShift s WHERE s.status = 'ACTIVE' AND s.startedAt < :threshold")
    List<AgentShift> findStaleActiveShifts(@Param("threshold") Instant threshold);

    @Query("SELECT s FROM AgentShift s WHERE s.agentId = :agentId AND CAST(s.startedAt AS LocalDate) = :date ORDER BY s.startedAt DESC")
    Optional<AgentShift> findByAgentIdAndDate(@Param("agentId") UUID agentId,
                                               @Param("date") LocalDate date);

    @Query("SELECT s FROM AgentShift s WHERE s.organizationId = :orgId AND s.startedAt >= :from AND s.startedAt < :to")
    List<AgentShift> findByOrgAndDate(@Param("orgId") UUID orgId, @Param("from") Instant from, @Param("to") Instant to);

    List<AgentShift> findByAgentIdOrderByStartedAtDesc(UUID agentId);
}
