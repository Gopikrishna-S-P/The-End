package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AssignmentAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssignmentAuditLogRepository extends JpaRepository<AssignmentAuditLog, UUID> {

    Page<AssignmentAuditLog> findByAssignmentIdOrderByCreatedAtDesc(UUID assignmentId, Pageable pageable);

    Page<AssignmentAuditLog> findByAllocationIdOrderByCreatedAtDesc(UUID allocationId, Pageable pageable);

    Page<AssignmentAuditLog> findByPerformedByOrderByCreatedAtDesc(UUID performedBy, Pageable pageable);

    @Query(value = "SELECT a FROM AssignmentAuditLog a WHERE a.performedBy IN " +
                   "(SELECT u.id FROM User u WHERE u.organizationId = :orgId)",
           countQuery = "SELECT COUNT(a) FROM AssignmentAuditLog a WHERE a.performedBy IN " +
                        "(SELECT u.id FROM User u WHERE u.organizationId = :orgId)")
    Page<AssignmentAuditLog> findByOrganizationId(@Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT a FROM AssignmentAuditLog a WHERE a.allocationId IN :allocationIds ORDER BY a.createdAt DESC")
    List<AssignmentAuditLog> findByAllocationIdsOrderByCreatedAtDesc(@Param("allocationIds") List<UUID> allocationIds);
}
