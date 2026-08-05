package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AgentCapacityConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentCapacityConfigRepository extends JpaRepository<AgentCapacityConfig, UUID> {

    Optional<AgentCapacityConfig> findByOrganizationId(UUID organizationId);
}
