package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AllocationAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AllocationAuditLogRepository extends JpaRepository<AllocationAuditLog, UUID> {

    List<AllocationAuditLog> findByAllocationIdOrderByCreatedAtDesc(UUID allocationId);
}
