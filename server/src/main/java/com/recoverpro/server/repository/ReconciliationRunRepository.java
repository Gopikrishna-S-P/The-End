package com.recoverpro.server.repository;

import com.recoverpro.server.entity.ReconciliationRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
public interface ReconciliationRunRepository extends JpaRepository<ReconciliationRun, UUID> {

    Page<ReconciliationRun> findByOrganizationIdOrderByCreatedAtDesc(
            UUID organizationId, Pageable pageable);

    /** Used by the EOD reconciliation file emitter. */
    List<ReconciliationRun> findByCreatedAtBetween(Instant start, Instant end);

    Optional<ReconciliationRun> findByStatementHash(String statementHash);

    /** Returns the most recent asOfDate ingested for an org. Used for out-of-order detection. */
    @Query("SELECT MAX(r.asOfDate) FROM ReconciliationRun r WHERE r.organizationId = :orgId")
    Optional<LocalDate> findMaxAsOfDateByOrganizationId(@Param("orgId") UUID orgId);
}
