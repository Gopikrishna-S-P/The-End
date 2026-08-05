package com.recoverpro.server.repository;

import com.recoverpro.server.entity.SettlementOffer;
import com.recoverpro.server.enums.SettlementOfferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface SettlementOfferRepository extends JpaRepository<SettlementOffer, UUID> {

    List<SettlementOffer> findByAllocationIdOrderByCreatedAtDesc(UUID allocationId);

    Page<SettlementOffer> findByOrganizationIdAndStatus(
            UUID organizationId, SettlementOfferStatus status, Pageable pageable);

    Page<SettlementOffer> findByOrganizationId(UUID organizationId, Pageable pageable);

    List<SettlementOffer> findByStatusAndValidityUntilBefore(SettlementOfferStatus status, Instant cutoff);
}
