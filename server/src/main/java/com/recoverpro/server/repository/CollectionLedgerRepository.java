package com.recoverpro.server.repository;

import com.recoverpro.server.entity.CollectionLedgerEntry;
import com.recoverpro.server.enums.LedgerEntryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface CollectionLedgerRepository extends JpaRepository<CollectionLedgerEntry, UUID> {

    List<CollectionLedgerEntry> findByCollectionIdOrderByCreatedAtAsc(UUID collectionId);

    List<CollectionLedgerEntry> findByOrganizationIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            UUID organizationId, Instant from, Instant to);

    /** Sum of all debits to an account for an org -- used for balance verification. */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM CollectionLedgerEntry e "
            + "WHERE e.organizationId = :orgId AND e.debitAccount = :account")
    BigDecimal sumDebits(@Param("orgId") UUID orgId, @Param("account") String account);

    /** Sum of all credits to an account for an org. */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM CollectionLedgerEntry e "
            + "WHERE e.organizationId = :orgId AND e.creditAccount = :account")
    BigDecimal sumCredits(@Param("orgId") UUID orgId, @Param("account") String account);

    boolean existsByCollectionIdAndEntryType(UUID collectionId, LedgerEntryType entryType);
}
