package com.recoverpro.server.repository;

import com.recoverpro.server.entity.NonContactable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface NonContactableRepository extends JpaRepository<NonContactable, UUID> {

    List<NonContactable> findByAllocationIdOrderByCreatedAtDesc(UUID allocationId);

    Page<NonContactable> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);

    Page<NonContactable> findByOrganizationIdAndAgentIdOrderByCreatedAtDesc(
            UUID organizationId, UUID agentId, Pageable pageable);

    @Query("SELECT n.agentId, COUNT(n) FROM NonContactable n WHERE n.organizationId = :orgId AND n.createdAt >= :from AND n.createdAt < :to GROUP BY n.agentId")
    List<Object[]> countByAgentForOrgAndDate(@Param("orgId") UUID orgId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(n) FROM NonContactable n WHERE n.organizationId = :orgId AND n.createdAt >= :from AND n.createdAt < :to")
    long countByOrgAndDate(@Param("orgId") UUID orgId, @Param("from") Instant from, @Param("to") Instant to);
}
