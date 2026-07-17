package com.recoverpro.server.repository;

import com.recoverpro.server.entity.RestructureProposal;
import com.recoverpro.server.enums.RestructureStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RestructureProposalRepository extends JpaRepository<RestructureProposal, UUID> {

    List<RestructureProposal> findByAllocationIdOrderByCreatedAtDesc(UUID allocationId);

    Page<RestructureProposal> findByOrganizationIdAndStatus(
            UUID organizationId, RestructureStatus status, Pageable pageable);

    Page<RestructureProposal> findByOrganizationId(UUID organizationId, Pageable pageable);
}
