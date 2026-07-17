package com.recoverpro.server.repository;

import com.recoverpro.server.entity.BankStatementRow;
import com.recoverpro.server.enums.ReconciliationOutcome;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface BankStatementRowRepository extends JpaRepository<BankStatementRow, UUID> {

    List<BankStatementRow> findByRunId(UUID runId);

    Page<BankStatementRow> findByRunId(UUID runId, Pageable pageable);

    Page<BankStatementRow> findByRunIdAndOutcome(
            UUID runId, ReconciliationOutcome outcome, Pageable pageable);

    /**
     * Recently-ingested rows still in UNMATCHED state. Used by the
     * reconciliation hourly sweep to re-apply match logic when a
     * delayed-arriving PaymentTransaction may now match. The 7-day window
     * keeps the sweep bounded -- older rows are taken to be permanent
     * exceptions and routed through the manual-review queue.
     */
    @Query("""
           SELECT b FROM BankStatementRow b
           WHERE b.outcome = com.recoverpro.server.enums.ReconciliationOutcome.UNMATCHED
             AND b.createdAt >= :cutoff
           """)
    List<BankStatementRow> findUnmatchedSince(@Param("cutoff") LocalDateTime cutoff);

    /**
     * Convenience overload -- last 7 days, the reconciliation sweep window.
     */
    default List<BankStatementRow> findRecentlyUnmatched() {
        return findUnmatchedSince(LocalDateTime.now().minusDays(7));
    }
}
