package com.recoverpro.server.repository;

import com.recoverpro.server.entity.ComplianceDecision;
import com.recoverpro.server.enums.GuardType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ComplianceDecisionRepository extends JpaRepository<ComplianceDecision, UUID> {

    List<ComplianceDecision> findByAllocationIdOrderByDecidedAtDesc(UUID allocationId);

    Page<ComplianceDecision> findByOrgIdOrderByDecidedAtDesc(UUID orgId, Pageable pageable);

    Page<ComplianceDecision> findByOrgIdAndGuardTypeOrderByDecidedAtDesc(UUID orgId, GuardType guardType, Pageable pageable);
}
