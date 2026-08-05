package com.recoverpro.server.repository;

import com.recoverpro.server.entity.BorrowerRiskScore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BorrowerRiskScoreRepository extends JpaRepository<BorrowerRiskScore, UUID> {

    Optional<BorrowerRiskScore> findFirstByBorrowerIdOrderByScoredAtDesc(UUID borrowerId);

    Page<BorrowerRiskScore> findByBorrowerIdOrderByScoredAtDesc(UUID borrowerId, Pageable pageable);

    Page<BorrowerRiskScore> findByOrganizationIdOrderByScoredAtDesc(UUID organizationId, Pageable pageable);

    List<BorrowerRiskScore> findByOrganizationIdAndScoredAtBetween(
            UUID organizationId, Instant from, Instant to);
}
