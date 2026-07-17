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

    @Modifying
    @Query("DELETE FROM AgentLocationPing p WHERE p.recordedAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
