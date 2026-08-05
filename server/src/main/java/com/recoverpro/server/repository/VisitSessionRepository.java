package com.recoverpro.server.repository;

import com.recoverpro.server.entity.VisitSession;
import com.recoverpro.server.enums.VisitSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisitSessionRepository extends JpaRepository<VisitSession, UUID> {

    Optional<VisitSession> findFirstByAgentIdAndStatusIn(UUID agentId, List<VisitSessionStatus> statuses);

    List<VisitSession> findByAgentIdAndStartedAtBetween(UUID agentId, Instant from, Instant to);

    List<VisitSession> findByOrgIdAndStartedAtBetween(UUID orgId, Instant from, Instant to);

    Optional<VisitSession> findByVisitLogId(UUID visitLogId);

    @Query("SELECT s.agentId, COALESCE(SUM(s.distanceMetres), 0) FROM VisitSession s WHERE s.orgId = :orgId AND s.startedAt >= :from AND s.startedAt < :to GROUP BY s.agentId")
    List<Object[]> sumDistanceByAgentForOrgAndDate(@Param("orgId") UUID orgId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(s) FROM VisitSession s WHERE s.orgId = :orgId AND s.startedAt >= :from AND s.startedAt < :to AND s.status IN :statuses")
    long countByOrgDateAndStatuses(@Param("orgId") UUID orgId, @Param("from") Instant from, @Param("to") Instant to, @Param("statuses") List<VisitSessionStatus> statuses);

    default Optional<VisitSession> findActiveByAgentId(UUID agentId) {
        return findFirstByAgentIdAndStatusIn(agentId,
                List.of(VisitSessionStatus.STARTED, VisitSessionStatus.REACHED, VisitSessionStatus.WAITING));
    }
}
