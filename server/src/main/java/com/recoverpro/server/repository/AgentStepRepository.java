package com.recoverpro.server.repository;

import com.recoverpro.server.entity.LucienAgentStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AgentStepRepository extends JpaRepository<LucienAgentStep, UUID> {

    List<LucienAgentStep> findAllBySessionIdOrderByCreatedAtAsc(String sessionId);
}
