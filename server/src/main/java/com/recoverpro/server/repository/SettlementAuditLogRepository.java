package com.recoverpro.server.repository;

import com.recoverpro.server.entity.SettlementAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SettlementAuditLogRepository extends JpaRepository<SettlementAuditLog, UUID> {

    List<SettlementAuditLog> findByAllocationIdOrderByCreatedAtDesc(UUID allocationId);
}
