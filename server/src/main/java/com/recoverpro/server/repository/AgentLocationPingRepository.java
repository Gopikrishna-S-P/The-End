package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AgentLocationPing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentLocationPingRepository extends JpaRepository<AgentLocationPing, UUID> {

    Optional<AgentLocationPing> findTopByVisitSessionIdOrderByRecordedAtDesc(UUID visitSessionId);

    Optional<AgentLocationPing> findTopByAgentIdOrderByRecordedAtDesc(UUID agentId);

    List<AgentLocationPing> findByAgentIdAndShiftIdOrderByRecordedAtDesc(UUID agentId, UUID shiftId);

    List<AgentLocationPing> findTop20ByAgentIdOrderByRecordedAtDesc(UUID agentId);

    long countByAgentIdAndRecordedAtAfter(UUID agentId, Instant since);

    /**
     * One latest ping per agent, in a single query -- for AgentFieldServiceImpl.listActiveAgents(),
     * which previously called findTop20ByAgentIdOrderByRecordedAtDesc() once per active agent (a
     * confirmed N+1 on the live team-status endpoint). Postgres-specific DISTINCT ON, which is the
     * standard "latest row per group" idiom and cheap given the existing (agent_id, recorded_at)
     * index (see the entity's @Table indexes).
     */
    @Query(value = "SELECT DISTINCT ON (agent_id) * FROM agent_location_pings "
            + "WHERE agent_id IN (:agentIds) ORDER BY agent_id, recorded_at DESC",
            nativeQuery = true)
    List<AgentLocationPing> findLatestPerAgent(@Param("agentIds") List<UUID> agentIds);

    @Modifying
    @Query("DELETE FROM AgentLocationPing p WHERE p.recordedAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
