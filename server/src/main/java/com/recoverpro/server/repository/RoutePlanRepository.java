package com.recoverpro.server.repository;

import com.recoverpro.server.entity.RoutePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoutePlanRepository extends JpaRepository<RoutePlan, UUID> {

    Optional<RoutePlan> findByAgentIdAndPlanDate(UUID agentId, LocalDate planDate);
}
