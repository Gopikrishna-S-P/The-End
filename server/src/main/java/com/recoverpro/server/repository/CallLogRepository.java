package com.recoverpro.server.repository;

import com.recoverpro.server.entity.CallLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CallLogRepository extends JpaRepository<CallLog, UUID> {

    List<CallLog> findByAllocationIdOrderByInitiatedAtDesc(UUID allocationId);

    Page<CallLog> findByOrganizationIdAndAgentIdOrderByInitiatedAtDesc(
            UUID organizationId, UUID agentId, Pageable pageable);
}
